import "react-native-get-random-values";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getEncryptionKey(key) {
  const keyName = `${key}_key`;
  let encryptionKey = await SecureStore.getItemAsync(keyName);
  if (!encryptionKey) {
    encryptionKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await SecureStore.setItemAsync(keyName, encryptionKey);
  }
  return aesjs.utils.hex.toBytes(encryptionKey);
}

export const LargeSecureStore = {
  async getItem(key) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    try {
      const encryptionKey = await getEncryptionKey(key);
      const cipher = new aesjs.ModeOfOperation.ctr(
        encryptionKey,
        new aesjs.Counter(1),
      );
      const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encrypted));
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      // Value predates the encrypted-storage migration (plain AsyncStorage JSON)
      // or was corrupted — drop it and require the user to sign in again.
      await AsyncStorage.removeItem(key);
      return null;
    }
  },

  async setItem(key, value) {
    const encryptionKey = await getEncryptionKey(key);
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1),
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  },

  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}_key`);
  },
};
