import { useCallback, useEffect, useReducer, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MfaCodeInput from "./MfaCodeInput";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/config";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  setAppLanguage,
  getSavedLanguagePreference,
} from "../utils/i18n";
import { deleteAllPlantsForUser } from "../db/plantsDb";
import { deletePlantPhotoFiles } from "../utils/supabaseStorage";
import {
  isNotificationsAvailable,
  requestNotificationPermission,
  sendTestNotification,
} from "../utils/notifications";
import {
  registerWateringBackgroundTask,
  runWateringCheckNow,
  unregisterWateringBackgroundTask,
} from "../utils/wateringReminderTask";
import {
  getPreferredNotifyTime,
  setPreferredNotifyTime,
  getSnoozeDays,
  setSnoozeDays,
} from "../utils/notificationPrefs";
import { useTheme, useThemeOverride, typography } from "../utils/theme";
import {
  showExpoGoUnavailableAlert,
  showGenericErrorAlert,
  showPermissionNeededAlert,
} from "../utils/alerts";
import { confirmDestructiveAction } from "../utils/confirmDelete";
import { storageKey } from "../utils/storageKeys";

function settingsKey(uid) {
  return storageKey(`settings:${uid}`);
}

function timeToDate({ hour, minute }) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatTime({ hour, minute }) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

const initialMfaState = {
  status: "off",
  factorId: null,
  secret: null,
  code: "",
  busy: false,
};

function mfaReducer(state, action) {
  switch (action.type) {
    case "loaded":
      return {
        ...initialMfaState,
        status: action.factorId ? "on" : "off",
        factorId: action.factorId,
      };
    case "busyChanged":
      return { ...state, busy: action.busy };
    case "enrollStarted":
      return {
        ...state,
        status: "enrolling",
        factorId: action.factorId,
        secret: action.secret,
        code: "",
      };
    case "codeChanged":
      return { ...state, code: action.code };
    case "enrollCancelled":
      return {
        ...state,
        status: "off",
        factorId: null,
        secret: null,
        code: "",
      };
    case "enrollVerified":
      return { ...state, status: "on", secret: null, code: "" };
    case "disabled":
      return { ...state, status: "off", factorId: null };
    default:
      return state;
  }
}

export default function SettingsScreen({ user }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { override: themeOverride, setOverride: setThemeOverride } =
    useThemeOverride();
  const [enabled, setEnabled] = useState(false);
  const [languagePreference, setLanguagePreference] = useState("system");
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [preferredTime, setPreferredTimeState] = useState({
    hour: 7,
    minute: 0,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [snoozeDays, setSnoozeDaysState] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [mfa, dispatchMfa] = useReducer(mfaReducer, initialMfaState);

  const loadMfaStatus = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    dispatchMfa({ type: "loaded", factorId: data?.totp?.[0]?.id ?? null });
  }, []);

  useEffect(() => {
    getSavedLanguagePreference().then(setLanguagePreference);
  }, []);

  const handleLanguageChange = async (language) => {
    await setAppLanguage(language);
    setLanguagePreference(language);
    setLanguagePickerOpen(false);
  };

  const languageDisplayLabel =
    languagePreference === "system"
      ? t("settings.languageAuto")
      : LANGUAGE_LABELS[languagePreference];

  useEffect(() => {
    if (!user?.uid) return;
    AsyncStorage.getItem(settingsKey(user.uid))
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setEnabled(saved.enabled);
        }
      })
      .catch(() => {});
    getPreferredNotifyTime().then(setPreferredTimeState);
    getSnoozeDays().then(setSnoozeDaysState);
    loadMfaStatus();
  }, [user?.uid, loadMfaStatus]);

  const persist = useCallback(
    (next) => {
      if (!user?.uid) return;
      AsyncStorage.setItem(settingsKey(user.uid), JSON.stringify(next));
    },
    [user?.uid],
  );

  const notificationsAvailable = isNotificationsAvailable();

  const handleToggle = async (value) => {
    if (!notificationsAvailable) {
      showExpoGoUnavailableAlert();
      return;
    }
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          showPermissionNeededAlert(t("settings.notificationPermissionReminders"));
          return;
        }
        await registerWateringBackgroundTask();
        await runWateringCheckNow();
      } else {
        await unregisterWateringBackgroundTask();
      }
      setEnabled(value);
      persist({ enabled: value });
    } catch (err) {
      showGenericErrorAlert(err);
    }
  };

  const handleTestNotification = async () => {
    if (!notificationsAvailable) {
      showExpoGoUnavailableAlert();
      return;
    }
    const sent = await sendTestNotification();
    if (!sent) {
      showPermissionNeededAlert(t("settings.notificationPermissionTest"));
      return;
    }
    Alert.alert(
      t("settings.testScheduledTitle"),
      t("settings.testScheduledMessage"),
    );
  };

  const handleTimeChange = (event, selectedDate) => {
    setPickerOpen(Platform.OS === "ios");
    if (!selectedDate) return;
    const next = {
      hour: selectedDate.getHours(),
      minute: selectedDate.getMinutes(),
    };
    setPreferredTimeState(next);
    setPreferredNotifyTime(next.hour, next.minute);
  };

  const handleTimeDismiss = () => {
    setPickerOpen(false);
  };

  const handleSnoozeDaysChange = (days) => {
    setSnoozeDaysState(days);
    setSnoozeDays(days);
  };

  const handleLogout = () => {
    confirmDestructiveAction(
      t("settings.logoutConfirmTitle"),
      t("settings.logoutConfirmMessage"),
      t("settings.logoutConfirmButton"),
      () => supabase.auth.signOut(),
    );
  };

  const handleDeleteAccount = () => {
    confirmDestructiveAction(
      t("settings.deleteAccountTitle"),
      t("settings.deleteAccountMessage"),
      t("settings.deleteAccountConfirmButton"),
      async () => {
        setDeleting(true);
        try {
          const { deletedPhotoPaths } = await deleteAllPlantsForUser(user.uid);
          await deletePlantPhotoFiles(deletedPhotoPaths);
          await AsyncStorage.removeItem(settingsKey(user.uid));
          await supabase.auth.signOut();
        } catch (err) {
          showGenericErrorAlert(err);
        } finally {
          setDeleting(false);
        }
      },
    );
  };

  const handleEnableMfaPress = () => {
    Alert.alert(
      t("settings.enableMfaConfirmTitle"),
      t("settings.enableMfaConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("settings.continueButton"), onPress: handleEnableMfa },
      ],
    );
  };

  const handleEnableMfa = async () => {
    dispatchMfa({ type: "busyChanged", busy: true });
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stray = existing?.all?.find(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "unverified",
      );
      if (stray) {
        await supabase.auth.mfa.unenroll({ factorId: stray.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error) throw error;
      dispatchMfa({
        type: "enrollStarted",
        factorId: data.id,
        secret: data.totp.secret,
      });
    } catch (err) {
      showGenericErrorAlert(err);
    } finally {
      dispatchMfa({ type: "busyChanged", busy: false });
    }
  };

  const handleVerifyMfaEnrollment = async () => {
    dispatchMfa({ type: "busyChanged", busy: true });
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: mfa.factorId,
        });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId: challenge.id,
        code: mfa.code.trim(),
      });
      if (verifyError) throw verifyError;
      dispatchMfa({ type: "enrollVerified" });
    } catch (err) {
      Alert.alert(
        t("settings.invalidCodeTitle"),
        t("settings.invalidCodeMessage"),
      );
    } finally {
      dispatchMfa({ type: "busyChanged", busy: false });
    }
  };

  const handleDisableMfa = () => {
    confirmDestructiveAction(
      t("settings.disableMfaConfirmTitle"),
      t("settings.disableMfaConfirmMessage"),
      t("settings.disableButton"),
      async () => {
        dispatchMfa({ type: "busyChanged", busy: true });
        try {
          await supabase.auth.mfa.unenroll({ factorId: mfa.factorId });
          dispatchMfa({ type: "disabled" });
        } catch (err) {
          showGenericErrorAlert(err);
        } finally {
          dispatchMfa({ type: "busyChanged", busy: false });
        }
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text
          style={[typography.screenTitle, styles.title, { color: theme.text }]}
        >
          {t("settings.title")}
        </Text>

        <View
          style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[typography.label, { color: theme.text }]}>
                {t("settings.account")}
              </Text>
              <Text
                style={[
                  typography.subtext,
                  styles.rowSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[typography.label, { color: theme.text }]}>
                {t("settings.wateringReminders")}
              </Text>
              <Text
                style={[
                  typography.subtext,
                  styles.rowSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                {notificationsAvailable
                  ? t("settings.reminderDescAvailable")
                  : t("settings.reminderDescUnavailable")}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[typography.label, { color: theme.text }]}>
              {t("settings.reminderTime")}
            </Text>
            <View
              style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}
            >
              <Text style={[typography.label, { color: theme.primary }]}>
                {formatTime(preferredTime)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.timeRow}>
            <Text style={[typography.label, { color: theme.text }]}>
              {t("settings.snoozeDuration")}
            </Text>
            <View style={styles.segmentGroup}>
              {[1, 2, 3].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor:
                        snoozeDays === days ? theme.primary : theme.surfaceAlt,
                    },
                  ]}
                  onPress={() => handleSnoozeDaysChange(days)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color:
                          snoozeDays === days ? theme.onPrimary : theme.text,
                      },
                    ]}
                  >
                    {t("settings.daysAbbrev", { count: days })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {pickerOpen && (
          <DateTimePicker
            value={timeToDate(preferredTime)}
            mode="time"
            is24Hour={false}
            onValueChange={handleTimeChange}
            onDismiss={handleTimeDismiss}
          />
        )}

        <TouchableOpacity
          style={[
            styles.testButton,
            theme.shadow,
            { backgroundColor: theme.card, borderColor: theme.primary },
          ]}
          onPress={handleTestNotification}
          activeOpacity={0.7}
        >
          <Text style={[typography.button, { color: theme.primary }]}>
            {t("settings.sendTestNotification")}
          </Text>
        </TouchableOpacity>

        <View
          style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
        >
          <View style={styles.timeRow}>
            <Text style={[typography.label, { color: theme.text }]}>
              {t("settings.appearance")}
            </Text>
            <View style={styles.segmentGroup}>
              {["system", "light", "dark"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor:
                        themeOverride === option
                          ? theme.primary
                          : theme.surfaceAlt,
                    },
                  ]}
                  onPress={() => setThemeOverride(option)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color:
                          themeOverride === option
                            ? theme.onPrimary
                            : theme.text,
                      },
                    ]}
                  >
                    {option === "system"
                      ? t("settings.appearanceAuto")
                      : option === "light"
                        ? t("settings.appearanceLight")
                        : t("settings.appearanceDark")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
        >
          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setLanguagePickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[typography.label, { color: theme.text }]}>
              {t("settings.language")}
            </Text>
            <View
              style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}
            >
              <Text style={[typography.label, { color: theme.primary }]}>
                {languageDisplayLabel}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Modal
          visible={languagePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguagePickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setLanguagePickerOpen(false)}
          >
            <View
              style={[styles.pickerSheet, { backgroundColor: theme.card }]}
            >
              {["system", ...SUPPORTED_LANGUAGES].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerRow}
                  onPress={() => handleLanguageChange(option)}
                >
                  <Text
                    style={[
                      typography.label,
                      {
                        color:
                          languagePreference === option
                            ? theme.primary
                            : theme.text,
                      },
                    ]}
                  >
                    {option === "system"
                      ? t("settings.languageAuto")
                      : LANGUAGE_LABELS[option]}
                  </Text>
                  {languagePreference === option ? (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <View
          style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[typography.label, { color: theme.text }]}>
                {t("settings.twoFactorAuth")}
              </Text>
              <Text
                style={[
                  typography.subtext,
                  styles.rowSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                {mfa.status === "on"
                  ? t("settings.mfaEnabledDesc")
                  : t("settings.mfaDisabledDesc")}
              </Text>
            </View>
          </View>

          {mfa.status === "enrolling" ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <Text
                style={[
                  typography.subtext,
                  styles.rowSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                {t("settings.mfaEnterKey")}
              </Text>
              <Text
                selectable
                style={[
                  typography.label,
                  styles.mfaSecret,
                  { color: theme.text, borderColor: theme.inputBorder },
                ]}
              >
                {mfa.secret}
              </Text>
              <MfaCodeInput
                code={mfa.code}
                onChangeCode={(code) =>
                  dispatchMfa({ type: "codeChanged", code })
                }
                onVerify={handleVerifyMfaEnrollment}
                onCancel={() => dispatchMfa({ type: "enrollCancelled" })}
                busy={mfa.busy}
              />
            </>
          ) : (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <TouchableOpacity
                style={styles.mfaActionRow}
                onPress={
                  mfa.status === "on" ? handleDisableMfa : handleEnableMfaPress
                }
                disabled={mfa.busy}
              >
                <Text
                  style={[
                    typography.button,
                    {
                      color: mfa.status === "on" ? theme.danger : theme.primary,
                    },
                  ]}
                >
                  {mfa.busy
                    ? t("settings.pleaseWait")
                    : mfa.status === "on"
                      ? t("settings.disable2fa")
                      : t("settings.enable2fa")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.testButton,
            theme.shadow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[typography.button, { color: theme.text }]}>
            {t("settings.logOut")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testButton,
            styles.dangerButton,
            { borderColor: theme.danger },
          ]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.7}
        >
          <Text style={[typography.button, { color: theme.danger }]}>
            {deleting ? t("settings.erasing") : t("settings.eraseData")}
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            typography.subtext,
            styles.version,
            { color: theme.textMuted },
          ]}
        >
          {t("settings.version", {
            version: Constants.expoConfig?.version ?? "1.0.0",
          })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowSubtext: {
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  timePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  testButton: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: "transparent",
  },
  segmentGroup: {
    flexDirection: "row",
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 32,
  },
  pickerSheet: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginLeft: 6,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    marginTop: 8,
  },
  mfaSecret: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 12,
    letterSpacing: 1,
    textAlign: "center",
  },
  mfaActionRow: {
    paddingVertical: 14,
  },
});
