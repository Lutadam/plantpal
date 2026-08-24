import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";
import i18n from "./i18n";

const REMINDER_ID = "daily-watering-reminder";
const LAST_ALERT_KEY = storageKey("lastWateringAlert");

// We deliberately deep-import from expo-notifications' individual files instead
// of the package's main entry point. The main entry point re-exports
// DevicePushTokenAutoRegistration.fx.js, which registers a push-token listener
// at import time and throws on Android in Expo Go (SDK 53+ removed push support
// there). None of the files below touch push tokens, so importing them directly
// avoids that throw and lets local notifications work in Expo Go on Android too.
// Caveat: this relies on expo-notifications' internal file layout (not its public
// API), so a future version bump could move these files and silently break this.
let Notifications = null;
try {
  const {
    setNotificationHandler,
  } = require("expo-notifications/build/NotificationsHandler");
  const {
    getPermissionsAsync,
    requestPermissionsAsync,
  } = require("expo-notifications/build/NotificationPermissions");
  const {
    setNotificationChannelAsync,
  } = require("expo-notifications/build/setNotificationChannelAsync");
  const {
    scheduleNotificationAsync,
  } = require("expo-notifications/build/scheduleNotificationAsync");
  const {
    cancelScheduledNotificationAsync,
  } = require("expo-notifications/build/cancelScheduledNotificationAsync");
  const {
    SchedulableTriggerInputTypes,
  } = require("expo-notifications/build/Notifications.types");
  const {
    AndroidImportance,
  } = require("expo-notifications/build/NotificationChannelManager.types");

  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  Notifications = {
    getPermissionsAsync,
    requestPermissionsAsync,
    setNotificationChannelAsync,
    scheduleNotificationAsync,
    cancelScheduledNotificationAsync,
    SchedulableTriggerInputTypes,
    AndroidImportance,
  };
} catch {
  Notifications = null;
}

export function isNotificationsAvailable() {
  return Notifications !== null;
}

export async function ensureAndroidChannel() {
  if (!Notifications || Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("watering-reminders", {
      name: "Watering reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // Expo Go's Android notification-channel native module is broken/incomplete
    // (throws a NullPointerException casting NotificationsChannelsProvider).
    // Fall through and let scheduling use Android's default channel instead.
  }
}

export async function requestNotificationPermission() {
  if (!Notifications) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

function wateringAlertBody(duePlants) {
  const names = duePlants.map((p) => p.name);
  if (names.length <= 3) {
    return i18n.t("notifications.wateringBody", { names: names.join(", ") });
  }
  const shown = names.slice(0, 3);
  return i18n.t("notifications.wateringBodyMore", {
    names: shown.join(", "),
    count: names.length - shown.length,
  });
}

// Fires a notification naming the plants that are actually due, but only once
// per distinct due-set (so a periodic background check doesn't re-notify every
// time it runs while the same plants remain overdue).
export async function scheduleWateringAlert(duePlants) {
  if (!Notifications) return;

  if (duePlants.length === 0) {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(
      () => {},
    );
    await AsyncStorage.removeItem(LAST_ALERT_KEY);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const ids = duePlants
    .map((p) => p.id)
    .sort()
    .join(",");
  const signature = `${today}:${ids}`;
  const lastSignature = await AsyncStorage.getItem(LAST_ALERT_KEY);
  if (signature === lastSignature) return;

  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(
    () => {},
  );
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: i18n.t("notifications.appName"),
      body: wateringAlertBody(duePlants),
    },
    trigger: null,
  });
  await AsyncStorage.setItem(LAST_ALERT_KEY, signature);
}

export async function cancelWateringAlert() {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(
    () => {},
  );
  await AsyncStorage.removeItem(LAST_ALERT_KEY);
}

export async function sendTestNotification() {
  if (!Notifications) return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notifications.testTitle"),
      body: i18n.t("notifications.testBody"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
  return true;
}
