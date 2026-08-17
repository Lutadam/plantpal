import { Alert } from 'react-native';

export function confirmDeletePlant(name, onConfirm) {
  Alert.alert('Delete plant', `Are you sure you want to delete "${name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
