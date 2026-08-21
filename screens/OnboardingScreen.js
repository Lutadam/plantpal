import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  requestNotificationPermission,
  isNotificationsAvailable,
} from "../utils/notifications";
import { useTheme, typography } from "../utils/theme";

const PERMISSION_ITEMS = [
  {
    icon: "camera",
    title: "Camera & Photos",
    description: "Photograph your plants and track their growth over time.",
  },
  {
    icon: "notifications",
    title: "Notifications",
    description: "Get reminded when it's time to water a plant that's due.",
  },
];

export default function OnboardingScreen({ onDone }) {
  const theme = useTheme();
  const [requesting, setRequesting] = useState(false);

  const handleContinue = async () => {
    setRequesting(true);
    try {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (isNotificationsAvailable()) {
        await requestNotificationPermission();
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
          Welcome to PlantPal
        </Text>
        <Text
          style={[
            typography.body,
            styles.subtitle,
            { color: theme.textSecondary },
          ]}
        >
          Before you get started, PlantPal needs a couple of permissions:
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
          You can change these later from your device settings, or disable
          reminders any time from Settings inside the app.
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
          {requesting ? "Setting up..." : "Continue"}
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
