import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BottomNav({ active, onChange }) {
  const tabs = [
    { key: 'addPlant', icon: 'add-circle' },
    { key: 'home', icon: 'home' },
    { key: 'settings', icon: 'settings' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.button}
          onPress={() => onChange(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={26}
            color={active === tab.key ? '#2e7d32' : '#757575'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
