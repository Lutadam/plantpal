import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import {
  requestNotificationPermission,
  isNotificationsAvailable,
} from "../utils/notifications";
import { useTheme, typography } from "../utils/theme";

export default function OnboardingScreen({ onDone }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);

  const PERMISSION_ITEMS = [
    {
      icon: "camera",
      title: t("onboarding.cameraTitle"),
      description: t("onboarding.cameraDesc"),
    },
    {
      icon: "notifications",
      title: t("onboarding.notificationsTitle"),
      description: t("onboarding.notificationsDesc"),
    },
  ];

  const handleContinue = async () => {
    setRequesting(true);
    try {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (isNotificationsAvailable()) {
        await requestNotificationPermission();
      }
      if (!camera.granted || !library.granted) {
        Alert.alert(
          t("onboarding.permissionNeededTitle"),
          t("onboarding.permissionDeniedMessage"),
        );
      }
    } finally {
      setRequesting(false);
      onDone?.();
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.content}>
        <Ionicons
          name="leaf"
          size={48}
          color={theme.primary}
          style={styles.headerIcon}
        />
        <Text
          style={[typography.screenTitle, styles.title, { color: theme.text }]}
        >
          {t("onboarding.title")}
        </Text>
        <Text
          style={[
            typography.body,
            styles.subtitle,
            { color: theme.textSecondary },
          ]}
        >
          {t("onboarding.intro")}
        </Text>

        {PERMISSION_ITEMS.map((item) => (
          <View
            key={item.title}
            style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}
            >
              <Ionicons name={item.icon} size={22} color={theme.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={[typography.label, { color: theme.text }]}>
                {item.title}
              </Text>
              <Text
                style={[
                  typography.subtext,
                  styles.cardDescription,
                  { color: theme.textSecondary },
                ]}
              >
                {item.description}
              </Text>
            </View>
          </View>
        ))}

        <Text
          style={[typography.subtext, styles.note, { color: theme.textMuted }]}
        >
          {t("onboarding.note")}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          theme.shadow,
          { backgroundColor: theme.primary },
        ]}
        onPress={handleContinue}
        disabled={requesting}
        activeOpacity={0.85}
      >
        <Text style={[typography.button, { color: theme.onPrimary }]}>
          {requesting ? t("onboarding.settingUp") : t("onboarding.continue")}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headerIcon: {
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardDescription: {
    marginTop: 2,
  },
  note: {
    textAlign: "center",
    marginTop: 16,
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
});
