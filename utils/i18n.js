import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";

import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import hi from "../locales/hi.json";

const LANGUAGE_KEY = storageKey("language");
export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "hi"];
export const LANGUAGE_LABELS = {
  en: "English",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
};

function resolveDeviceLanguage() {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    hi: { translation: hi },
  },
  lng: resolveDeviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export async function loadSavedLanguage() {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    await i18n.changeLanguage(saved);
  }
}

export async function setAppLanguage(language) {
  await i18n.changeLanguage(language);
  if (language === "system") {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
    await i18n.changeLanguage(resolveDeviceLanguage());
  } else {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  }
}

export async function getSavedLanguagePreference() {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  return saved && SUPPORTED_LANGUAGES.includes(saved) ? saved : "system";
}

export default i18n;
