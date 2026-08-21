import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";

const PREFERRED_TIME_KEY = storageKey("preferredNotifyTime");
const DEFAULT_HOUR = 7;
const DEFAULT_MINUTE = 0;

export async function setPreferredNotifyTime(hour, minute) {
  await AsyncStorage.setItem(PREFERRED_TIME_KEY, `${hour}:${minute}`);
}

export async function getPreferredNotifyTime() {
  const raw = await AsyncStorage.getItem(PREFERRED_TIME_KEY);
  if (raw === null) return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  const [hour, minute] = raw.split(":").map(Number);
  return { hour, minute };
}

export async function getPreferredNotifyHour() {
  const { hour } = await getPreferredNotifyTime();
  return hour;
}

const SNOOZE_DAYS_KEY = storageKey("snoozeDays");
const DEFAULT_SNOOZE_DAYS = 1;

export async function getSnoozeDays() {
  const raw = await AsyncStorage.getItem(SNOOZE_DAYS_KEY);
  return raw ? Number(raw) : DEFAULT_SNOOZE_DAYS;
}

export async function setSnoozeDays(days) {
  await AsyncStorage.setItem(SNOOZE_DAYS_KEY, String(days));
}
