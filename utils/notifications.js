import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";
import i18n from "./i18n";
import { DAY_MS, getNextWateringDate, wateringIntervalDays } from "./watering";
import { getPreferredNotifyTime } from "./notificationPrefs";

const CHANNEL_ID = "watering-reminders";
const REMINDER_PREFIX = "plantpal-water-";
const SCHEDULED_IDS_KEY = storageKey("scheduledWateringIds");

// Pre-dated reminders left with the OS, so they fire with the app closed. We
// cap the window because iOS allows only 64 pending notifications per app.
const HORIZON_DAYS = 30;
const MAX_SCHEDULED = 20;

// Superseded by the pre-scheduled reminders above; still cancelled on upgrade
// so a leftover from the old fire-immediately design doesn't linger.
const LEGACY_REMINDER_ID = "daily-watering-reminder";
const LEGACY_LAST_ALERT_KEY = storageKey("lastWateringAlert");

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
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
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

// Read-only check, for the permissions dashboard in Settings — unlike the
// function above, this never prompts the user.
export async function getNotificationPermissionStatus() {
  if (!Notifications) return { granted: false, canAskAgain: true };
  const settings = await Notifications.getPermissionsAsync();
  return { granted: !!settings.granted, canAskAgain: !!settings.canAskAgain };
}

function wateringAlertBody(names) {
  if (names.length <= 3) {
    return i18n.t("notifications.wateringBody", { names: names.join(", ") });
  }
  const shown = names.slice(0, 3);
  return i18n.t("notifications.wateringBodyMore", {
    names: shown.join(", "),
    count: names.length - shown.length,
  });
}

// Local calendar day, not `toISOString()` — that reports the UTC day, which
// rolls over at the wrong moment for anyone not on UTC.
function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function slotOn(date, hour, minute) {
  const slot = new Date(date);
  slot.setHours(hour, minute, 0, 0);
  return slot;
}

// The first reminder slot strictly after `now` — today's if it hasn't passed,
// otherwise tomorrow's.
function nextSlotAfter(now, hour, minute) {
  const slot = slotOn(now, hour, minute);
  if (slot > now) return slot;
  return slotOn(new Date(now.getTime() + DAY_MS), hour, minute);
}

// Every reminder worth scheduling in the horizon, one entry per calendar day
// with the names of the plants due that day. A plant recurs on its own
// interval, so watering it once covers the next several cycles even if the app
// is never opened again.
function upcomingReminders(plants, { hour, minute }) {
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);
  const byDay = new Map();

  const add = (fireAt, name) => {
    const key = dayKey(fireAt);
    const existing = byDay.get(key);
    if (existing) {
      existing.names.push(name);
      return;
    }
    byDay.set(key, { fireAt, names: [name] });
  };

  for (const plant of plants) {
    const base = getNextWateringDate(plant);
    const intervalMs = wateringIntervalDays(plant) * DAY_MS;

    for (let cycle = 0; ; cycle++) {
      const due = new Date(base.getTime() + cycle * intervalMs);
      if (due > horizon) break;

      const fireAt = slotOn(due, hour, minute);
      if (fireAt > now) {
        add(fireAt, plant.name);
        continue;
      }
      // Already due (or due earlier today than the reminder time) — it can't be
      // scheduled in the past, so remind at the next slot ahead instead.
      if (cycle === 0) add(nextSlotAfter(now, hour, minute), plant.name);
    }
  }

  return [...byDay.values()]
    .sort((a, b) => a.fireAt - b.fireAt)
    .slice(0, MAX_SCHEDULED);
}

// Hands Android/iOS a dated reminder for each upcoming watering day, so they
// are delivered by the OS whether or not the app is running. Call this whenever
// the plant list or the preferred time changes.
export async function refreshWateringSchedule(plants) {
  if (!Notifications) return 0;

  await cancelAllWateringNotifications();
  if (!plants?.length) return 0;

  const reminders = upcomingReminders(plants, await getPreferredNotifyTime());
  if (reminders.length === 0) return 0;

  await ensureAndroidChannel();
  const ids = [];
  for (const { fireAt, names } of reminders) {
    const id = `${REMINDER_PREFIX}${dayKey(fireAt)}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: i18n.t("notifications.appName"),
        body: wateringAlertBody(names),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  return ids.length;
}

export async function cancelAllWateringNotifications() {
  if (!Notifications) return;

  const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
  const ids = raw ? JSON.parse(raw) : [];
  for (const id of [...ids, LEGACY_REMINDER_ID]) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  await AsyncStorage.multiRemove([SCHEDULED_IDS_KEY, LEGACY_LAST_ALERT_KEY]);
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
