import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKey } from "./storageKeys";

const THEME_OVERRIDE_KEY = storageKey("themeOverride");

const light = {
  mode: "light",
  background: "#ffffff",
  surface: "#f5f5f5",
  surfaceAlt: "#e8f5e9",
  card: "#f5f5f5",
  text: "#212121",
  textSecondary: "#757575",
  textMuted: "#9e9e9e",
  placeholderIcon: "#bdbdbd",
  border: "#e0e0e0",
  inputBorder: "#cccccc",
  iconMuted: "#616161",
  iconSubtle: "#666666",
  primary: "#2e7d32",
  onPrimary: "#ffffff",
  danger: "#c62828",
  dangerBg: "#fdecea",
  warning: "#f9a825",
  statusBarStyle: "dark",
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

const dark = {
  mode: "dark",
  background: "#121212",
  surface: "#1e1e1e",
  surfaceAlt: "#1b3320",
  card: "#1e1e1e",
  text: "#f0f0f0",
  textSecondary: "#b0b0b0",
  textMuted: "#8a8a8a",
  placeholderIcon: "#5c5c5c",
  border: "#2c2c2c",
  inputBorder: "#3a3a3a",
  iconMuted: "#b0b0b0",
  iconSubtle: "#b0b0b0",
  primary: "#4caf50",
  onPrimary: "#0d1f0f",
  danger: "#ef5350",
  dangerBg: "#3b1f1f",
  warning: "#ffb74d",
  statusBarStyle: "light",
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [override, setOverrideState] = useState("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_OVERRIDE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setOverrideState(saved);
    });
  }, []);

  const setOverride = (value) => {
    setOverrideState(value);
    if (value === "system") {
      AsyncStorage.removeItem(THEME_OVERRIDE_KEY);
    } else {
      AsyncStorage.setItem(THEME_OVERRIDE_KEY, value);
    }
  };

  const resolvedMode = override === "system" ? systemScheme : override;
  const theme = resolvedMode === "dark" ? dark : light;

  const value = useMemo(
    () => ({ theme, override, setOverride }),
    [theme, override],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx.theme;
}

export function useThemeOverride() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error("useThemeOverride must be used within a ThemeProvider");
  return { override: ctx.override, setOverride: ctx.setOverride };
}

// Shared type scale so every screen's title/label/body text matches in size
// and weight. Color is applied separately via theme tokens (theme.text,
// theme.textSecondary, ...) since that stays semantic (e.g. errors in
// theme.danger), not part of the type scale itself.
export const typography = {
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
  },
  subtext: {
    fontSize: 13,
    fontWeight: "400",
  },
  button: {
    fontSize: 16,
    fontWeight: "600",
  },
};
