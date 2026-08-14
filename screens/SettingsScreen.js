import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelDailyReminder,
  isNotificationsAvailable,
  requestNotificationPermission,
  scheduleDailyReminder,
  sendTestNotification,
} from '../utils/notifications';
import { useTheme } from '../utils/theme';

const TIME_PRESETS = [
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
];

function settingsKey(uid) {
  return `plantpal:settings:${uid}`;
}

export default function SettingsScreen({ user }) {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(TIME_PRESETS[0]);

  useEffect(() => {
    if (!user?.uid) return;
    AsyncStorage.getItem(settingsKey(user.uid))
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setEnabled(saved.enabled);
          setReminderTime(saved.reminderTime);
        }
      })
      .catch(() => {});
  }, [user?.uid]);

  const persist = useCallback(
    (next) => {
      if (!user?.uid) return;
      AsyncStorage.setItem(settingsKey(user.uid), JSON.stringify(next));
    },
    [user?.uid]
  );

  const notificationsAvailable = isNotificationsAvailable();

  const handleToggle = async (value) => {
    if (!notificationsAvailable) {
      Alert.alert(
        'Not available in Expo Go',
        'Notifications need a development build on this platform (Expo Go removed support in SDK 53+). Build with EAS to use this feature.'
      );
      return;
    }
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your device settings to get watering reminders.'
        );
        return;
      }
      await scheduleDailyReminder(reminderTime.hour, reminderTime.minute);
    } else {
      await cancelDailyReminder();
    }
    setEnabled(value);
    persist({ enabled: value, reminderTime });
  };

  const handleTestNotification = async () => {
    if (!notificationsAvailable) {
      Alert.alert(
        'Not available in Expo Go',
        'Notifications need a development build on this platform (Expo Go removed support in SDK 53+). Build with EAS to use this feature.'
      );
      return;
    }
    const sent = await sendTestNotification();
    if (!sent) {
      Alert.alert(
        'Permission needed',
        'Enable notifications in your device settings to receive a test notification.'
      );
      return;
    }
    Alert.alert('Test scheduled', 'A test notification will arrive in about 5 seconds.');
  };

  const handleSelectTime = async (preset) => {
    setReminderTime(preset);
    persist({ enabled, reminderTime: preset });
    if (enabled) {
      await scheduleDailyReminder(preset.hour, preset.minute);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            Watering Reminders
          </Text>
          <Text style={[styles.rowSubtext, { color: theme.textSecondary }]}>
            {notificationsAvailable
              ? 'Get a daily notification to check on your plants'
              : 'Requires a development build (not supported in Expo Go)'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ true: theme.primary }}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Reminder time
      </Text>
      <View style={styles.presetRow}>
        {TIME_PRESETS.map((preset) => {
          const selected = preset.label === reminderTime.label;
          return (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetChip,
                {
                  borderColor: selected ? theme.primary : theme.inputBorder,
                  backgroundColor: selected ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => handleSelectTime(preset)}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: selected ? theme.onPrimary : theme.text },
                  selected && styles.presetTextSelected,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.testButton, { borderColor: theme.primary }]}
        onPress={handleTestNotification}
      >
        <Text style={[styles.testButtonText, { color: theme.primary }]}>
          Send test notification (5s)
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  presetText: {
    fontSize: 14,
  },
  presetTextSelected: {
    fontWeight: '600',
  },
  testButton: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  testButtonText: {
    fontWeight: '600',
  },
});
