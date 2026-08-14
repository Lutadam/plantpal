import { Platform } from 'react-native';

const REMINDER_ID = 'daily-watering-reminder';

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
  const { setNotificationHandler } = require('expo-notifications/build/NotificationsHandler');
  const {
    getPermissionsAsync,
    requestPermissionsAsync,
  } = require('expo-notifications/build/NotificationPermissions');
  const {
    setNotificationChannelAsync,
  } = require('expo-notifications/build/setNotificationChannelAsync');
  const {
    scheduleNotificationAsync,
  } = require('expo-notifications/build/scheduleNotificationAsync');
  const {
    cancelScheduledNotificationAsync,
  } = require('expo-notifications/build/cancelScheduledNotificationAsync');
  const {
    SchedulableTriggerInputTypes,
  } = require('expo-notifications/build/Notifications.types');
  const {
    AndroidImportance,
  } = require('expo-notifications/build/NotificationChannelManager.types');

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
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('watering-reminders', {
      name: 'Watering reminders',
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

export async function scheduleDailyReminder(hour, minute) {
  if (!Notifications) return;
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'PlantPal',
      body: 'Time to check on your plants and water them if needed.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder() {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}

export async function sendTestNotification() {
  if (!Notifications) return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'PlantPal test',
      body: 'If you see this, notifications are working.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
  return true;
}
