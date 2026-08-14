import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

export default function BottomNav({ active, onChange }) {
  const theme = useTheme();
  const tabs = [
    { key: 'addPlant', icon: 'add-circle' },
    { key: 'home', icon: 'home' },
    { key: 'settings', icon: 'settings' },
  ];

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.container,
        { backgroundColor: theme.background, borderTopColor: theme.border },
      ]}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.button}
          onPress={() => onChange(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={26}
            color={active === tab.key ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
