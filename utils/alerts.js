import { Alert } from 'react-native';

export function showExpoGoUnavailableAlert() {
  Alert.alert(
    'Not available in Expo Go',
    'Notifications need a development build on this platform (Expo Go removed support in SDK 53+). Build with EAS to use this feature.'
  );
}

export function showPermissionNeededAlert(message) {
  Alert.alert('Permission needed', message);
}
