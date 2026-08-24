import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./supabase/config";
import "./utils/i18n";
import { loadSavedLanguage } from "./utils/i18n";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AddPlantScreen from "./screens/AddPlantScreen";
import SettingsScreen from "./screens/SettingsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import BottomNav from "./screens/BottomNav";
import { ThemeProvider, useTheme } from "./utils/theme";
import { toAppUser, needsMfaChallenge } from "./utils/supabaseUser";
import { handlePasswordRecoveryUrl } from "./utils/authDeepLink";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  setCurrentUserId,
} from "./utils/currentUser";
import { TABS } from "./utils/tabs";

async function isFullyAuthenticated(session) {
  if (!session?.user?.email_confirmed_at) return false;
  if (await needsMfaChallenge()) return false;
  return true;
}

const SCREEN_COMPONENTS = {
  home: DashboardScreen,
  addPlant: AddPlantScreen,
  settings: SettingsScreen,
};

const SCREENS = Object.fromEntries(
  TABS.map((tab) => [tab.key, SCREEN_COMPONENTS[tab.key]]),
);

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [onboarded, setOnboarded] = useState(false);
  const [awaitingPasswordReset, setAwaitingPasswordReset] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const authEventSeq = useRef(0);

  useEffect(() => {
    loadSavedLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const seq = ++authEventSeq.current;
      const ready = await isFullyAuthenticated(session);
      if (seq !== authEventSeq.current) return;
      const nextUser = ready ? toAppUser(session) : null;
      setUser(nextUser);
      setCurrentUserId(nextUser?.uid ?? null);
      if (nextUser) {
        setOnboarded(await hasCompletedOnboarding(nextUser.uid));
      } else {
        setOnboarded(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const processUrl = async (url) => {
      const handled = await handlePasswordRecoveryUrl(url);
      if (handled) setAwaitingPasswordReset(true);
    };
    Linking.getInitialURL().then((url) => {
      if (url) processUrl(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) =>
      processUrl(url),
    );
    return () => subscription.remove();
  }, []);

  const handleOnboardingDone = async () => {
    if (user?.uid) await markOnboardingComplete(user.uid);
    setOnboarded(true);
  };

  const handlePasswordResetDone = () => {
    setAwaitingPasswordReset(false);
  };

  const handlePasswordResetCancel = async () => {
    await supabase.auth.signOut();
    setAwaitingPasswordReset(false);
  };

  const ActiveScreen = SCREENS[activeTab];
  const screen = awaitingPasswordReset
    ? "resetPassword"
    : !user
      ? "login"
      : !onboarded
        ? "onboarding"
        : "home";

  if (!languageReady) return null;

  return (
    <SafeAreaProvider>
      {screen === "home" && (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1 }}>
            <ActiveScreen user={user} onAdded={() => setActiveTab("home")} />
          </View>
          <BottomNav active={activeTab} onChange={setActiveTab} />
        </View>
      )}
      {screen === "onboarding" && (
        <OnboardingScreen onDone={handleOnboardingDone} />
      )}
      {screen === "resetPassword" && (
        <ResetPasswordScreen
          onDone={handlePasswordResetDone}
          onCancel={handlePasswordResetCancel}
        />
      )}
      {screen === "login" && <LoginScreen />}
      <StatusBar style={theme.statusBarStyle} />
    </SafeAreaProvider>
  );
}
