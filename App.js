import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddPlantScreen from './screens/AddPlantScreen';
import SettingsScreen from './screens/SettingsScreen';
import BottomNav from './screens/BottomNav';
import { useTheme } from './utils/theme';
import { setCurrentUserId } from './utils/currentUser';
import { TABS } from './utils/tabs';

const SCREEN_COMPONENTS = {
  home: DashboardScreen,
  addPlant: AddPlantScreen,
  settings: SettingsScreen,
};

const SCREENS = Object.fromEntries(
  TABS.map((tab) => [tab.key, SCREEN_COMPONENTS[tab.key]])
);

export default function App() {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setCurrentUserId(nextUser?.emailVerified ? nextUser.uid : null);
    });
  }, []);

  const ActiveScreen = SCREENS[activeTab];

  return (
    <SafeAreaProvider>
      {user?.emailVerified ? (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1 }}>
            <ActiveScreen user={user} onAdded={() => setActiveTab('home')} />
          </View>
          <BottomNav active={activeTab} onChange={setActiveTab} />
        </View>
      ) : (
        <LoginScreen />
      )}
      <StatusBar style={theme.statusBarStyle} />
    </SafeAreaProvider>
  );
}
