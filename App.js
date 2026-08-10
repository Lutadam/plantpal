import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddPlantScreen from './screens/AddPlantScreen';
import SettingsScreen from './screens/SettingsScreen';
import BottomNav from './screens/BottomNav';

const SCREENS = {
  home: DashboardScreen,
  addPlant: AddPlantScreen,
  settings: SettingsScreen,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const ActiveScreen = SCREENS[activeTab];

  return (
    <>
      {user?.emailVerified ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <ActiveScreen user={user} onAdded={() => setActiveTab('home')} />
          </View>
          <BottomNav active={activeTab} onChange={setActiveTab} />
        </View>
      ) : (
        <LoginScreen />
      )}
      <StatusBar style="auto" />
    </>
  );
}
