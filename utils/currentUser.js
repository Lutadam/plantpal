import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKey } from './storageKeys';

const CURRENT_USER_KEY = storageKey('currentUserId');

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
