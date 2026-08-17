import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  isNotificationsAvailable,
  requestNotificationPermission,
  sendTestNotification,
} from '../utils/notifications';
import {
  registerWateringBackgroundTask,
  runWateringCheckNow,
  unregisterWateringBackgroundTask,
} from '../utils/wateringReminderTask';
import {
  getPreferredNotifyTime,
  setPreferredNotifyTime,
} from '../utils/notificationPrefs';
import { useTheme, typography } from '../utils/theme';
import { showExpoGoUnavailableAlert, showPermissionNeededAlert } from '../utils/alerts';
import { storageKey } from '../utils/storageKeys';

function settingsKey(uid) {
  return storageKey(`settings:${uid}`);
}

function timeToDate({ hour, minute }) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatTime({ hour, minute }) {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function SettingsScreen({ user }) {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [preferredTime, setPreferredTimeState] = useState({ hour: 7, minute: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    AsyncStorage.getItem(settingsKey(user.uid))
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setEnabled(saved.enabled);
        }
      })
      .catch(() => {});
    getPreferredNotifyTime().then(setPreferredTimeState);
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
      showExpoGoUnavailableAlert();
      return;
    }
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showPermissionNeededAlert(
          'Enable notifications in your device settings to get watering reminders.'
        );
        return;
      }
      await registerWateringBackgroundTask();
      await runWateringCheckNow();
    } else {
      await unregisterWateringBackgroundTask();
    }
    setEnabled(value);
    persist({ enabled: value });
  };

  const handleTestNotification = async () => {
    if (!notificationsAvailable) {
      showExpoGoUnavailableAlert();
      return;
    }
    const sent = await sendTestNotification();
    if (!sent) {
      showPermissionNeededAlert(
        'Enable notifications in your device settings to receive a test notification.'
      );
      return;
    }
    Alert.alert('Test scheduled', 'A test notification will arrive in about 5 seconds.');
  };

  const handleTimeChange = (event, selectedDate) => {
    setPickerOpen(Platform.OS === 'ios');
    if (!selectedDate) return;
    const next = { hour: selectedDate.getHours(), minute: selectedDate.getMinutes() };
    setPreferredTimeState(next);
    setPreferredNotifyTime(next.hour, next.minute);
  };

  const handleTimeDismiss = () => {
    setPickerOpen(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <Text style={[typography.screenTitle, styles.title, { color: theme.text }]}>Settings</Text>

      <View style={[styles.card, theme.shadow, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[typography.label, { color: theme.text }]}>
              Watering Reminders
            </Text>
            <Text style={[typography.subtext, styles.rowSubtext, { color: theme.textSecondary }]}>
              {notificationsAvailable
                ? 'Get notified when a plant actually needs water, checked periodically in the background'
                : 'Requires a development build (not supported in Expo Go)'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ true: theme.primary }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.timeRow}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[typography.label, { color: theme.text }]}>Reminder time</Text>
          <View style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[typography.label, { color: theme.primary }]}>
              {formatTime(preferredTime)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      {pickerOpen && (
        <DateTimePicker
          value={timeToDate(preferredTime)}
          mode="time"
          is24Hour={false}
          onValueChange={handleTimeChange}
          onDismiss={handleTimeDismiss}
        />
      )}

      <TouchableOpacity
        style={[styles.testButton, theme.shadow, { backgroundColor: theme.card, borderColor: theme.primary }]}
        onPress={handleTestNotification}
        activeOpacity={0.7}
      >
        <Text style={[typography.button, { color: theme.primary }]}>
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
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowSubtext: {
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  timePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  testButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
