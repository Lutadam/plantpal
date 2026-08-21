import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";

const CURRENT_USER_KEY = storageKey("currentUserId");

export async function setCurrentUserId(uid) {
  if (uid) {
    await AsyncStorage.setItem(CURRENT_USER_KEY, uid);
  } else {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  }
}

export async function getCurrentUserId() {
  return AsyncStorage.getItem(CURRENT_USER_KEY);
}

const ONBOARDED_KEY_PREFIX = "onboarded:";

export async function hasCompletedOnboarding(uid) {
  const value = await AsyncStorage.getItem(
    storageKey(`${ONBOARDED_KEY_PREFIX}${uid}`),
  );
  return value === "true";
}

export async function markOnboardingComplete(uid) {
  await AsyncStorage.setItem(
    storageKey(`${ONBOARDED_KEY_PREFIX}${uid}`),
    "true",
  );
}
