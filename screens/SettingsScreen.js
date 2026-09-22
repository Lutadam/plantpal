import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
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
  disableWateringReminders,
  registerWateringBackgroundTask,
  runWateringCheckNow,
} from "../utils/wateringReminderTask";
import {
  getPreferredNotifyTime,
  setPreferredNotifyTime,
  setNotificationsEnabled,
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
import { PERMISSIONS, openAppSettings } from "../utils/permissions";

function settingsKey(uid) {
  return storageKey(`settings:${uid}`);
}

function timeToDate({ hour, minute }) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatTime({ hour, minute }) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
  const [permissionStatuses, setPermissionStatuses] = useState({});

  useEffect(() => {
    getSavedLanguagePreference().then(setLanguagePreference);
  }, []);

  const refreshPermissionStatuses = useCallback(async () => {
    const entries = await Promise.all(
      PERMISSIONS.map(async (permission) => {
        if (permission.unavailable) {
          return [permission.key, { granted: false, unavailable: true }];
        }
        const status = await permission.check();
        return [permission.key, status];
      }),
    );
    setPermissionStatuses(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    refreshPermissionStatuses();
  }, [refreshPermissionStatuses]);

  // The only way a denied permission changes is the user granting it in the
  // OS Settings app and coming back — refresh whenever that could have
  // happened, same pattern DashboardScreen uses for its own data.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current === "background" && nextState === "active") {
        refreshPermissionStatuses();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [refreshPermissionStatuses]);

  const handlePermissionAction = async (permission) => {
    const status = permissionStatuses[permission.key];
    if (status?.canAskAgain === false) {
      openAppSettings();
      return;
    }
    await permission.request();
    refreshPermissionStatuses();
  };

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
          // Carry the existing per-user switch into the global key the
          // scheduler reads, so upgrades don't silently lose reminders.
          setNotificationsEnabled(!!saved.enabled);
        }
      })
      .catch(() => {});
    getPreferredNotifyTime().then(setPreferredTimeState);
    getSnoozeDays().then(setSnoozeDaysState);
  }, [user?.uid]);

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
        await setNotificationsEnabled(true);
        await registerWateringBackgroundTask();
        await runWateringCheckNow();
      } else {
        await setNotificationsEnabled(false);
        await disableWateringReminders();
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

  const handleTimeChange = async (event, selectedDate) => {
    setPickerOpen(Platform.OS === "ios");
    if (!selectedDate) return;
    const next = {
      hour: selectedDate.getHours(),
      minute: selectedDate.getMinutes(),
    };
    setPreferredTimeState(next);
    await setPreferredNotifyTime(next.hour, next.minute);
    // The already-scheduled reminders carry the old time, so re-issue them.
    if (enabled) await runWateringCheckNow().catch(() => {});
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
          <Text
            style={[
              typography.label,
              styles.permissionsTitle,
              { color: theme.text },
            ]}
          >
            {t("settings.permissions")}
          </Text>
          {PERMISSIONS.map((permission, index) => {
            const status = permissionStatuses[permission.key];
            const granted = !!status?.granted;
            const showButton = !permission.unavailable && !granted;
            return (
              <View key={permission.key}>
                {index > 0 ? (
                  <View
                    style={[styles.divider, { backgroundColor: theme.border }]}
                  />
                ) : null}
                <View style={styles.permissionRow}>
                  <View style={styles.rowText}>
                    <Text style={[typography.label, { color: theme.text }]}>
                      {t(permission.labelKey)}
                    </Text>
                    <Text
                      style={[
                        typography.subtext,
                        styles.rowSubtext,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t(permission.descriptionKey)}
                    </Text>
                  </View>
                  {permission.unavailable ? (
                    <Text
                      style={[
                        styles.permissionStatus,
                        { color: theme.textMuted },
                      ]}
                    >
                      {t("settings.permissionUnavailable")}
                    </Text>
                  ) : granted ? (
                    <View style={styles.permissionGranted}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.primary}
                      />
                      <Text
                        style={[
                          styles.permissionStatus,
                          { color: theme.primary },
                        ]}
                      >
                        {t("settings.permissionGranted")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {showButton ? (
                  <TouchableOpacity
                    style={[
                      styles.permissionButton,
                      { borderColor: theme.primary },
                    ]}
                    onPress={() => handlePermissionAction(permission)}
                  >
                    <Text
                      style={[
                        styles.permissionButtonText,
                        { color: theme.primary },
                      ]}
                    >
                      {status?.canAskAgain === false
                        ? t("settings.permissionOpenSettings")
                        : t("settings.permissionAllow")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
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

          {Platform.OS === "android" && enabled && (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text
                    style={[
                      typography.subtext,
                      styles.rowSubtext,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("settings.batteryOptimizationHint")}
                  </Text>
                  <TouchableOpacity onPress={openAppSettings}>
                    <Text
                      style={[
                        typography.label,
                        { color: theme.primary, marginTop: 6 },
                      ]}
                    >
                      {t("settings.openBatterySettings")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[typography.label, styles.rowLabel, { color: theme.text }]}
            >
              {t("settings.reminderTime")}
            </Text>
            <View
              style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}
            >
              <Text
                style={[
                  typography.label,
                  styles.pillText,
                  { color: theme.primary },
                ]}
              >
                {formatTime(preferredTime)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.timeRow}>
            <Text
              style={[typography.label, styles.rowLabel, { color: theme.text }]}
            >
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
            is24Hour={true}
            themeVariant={theme.mode}
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
            <Text
              style={[typography.label, styles.rowLabel, { color: theme.text }]}
            >
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
            <Text
              style={[typography.label, styles.rowLabel, { color: theme.text }]}
            >
              {t("settings.language")}
            </Text>
            <View
              style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}
            >
              <Text
                style={[
                  typography.label,
                  styles.pillText,
                  { color: theme.primary },
                ]}
              >
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
  permissionsTitle: {
    paddingTop: 16,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  permissionStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  permissionGranted: {
    flexDirection: "row",
    alignItems: "center",
  },
  permissionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
  rowLabel: {
    flex: 1,
    marginRight: 12,
  },
  // A pill sized to its content still clips if the platform draws the glyphs
  // wider than RN measured, so leave a couple of pixels of slack.
  pillText: {
    paddingHorizontal: 2,
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
    paddingHorizontal: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    marginTop: 8,
  },
});
