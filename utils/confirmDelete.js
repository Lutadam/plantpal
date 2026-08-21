import { Alert } from "react-native";

export function confirmDestructiveAction(
  title,
  message,
  confirmLabel,
  onConfirm,
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export function confirmDeletePlant(name, onConfirm) {
  confirmDestructiveAction(
    "Delete plant",
    `Are you sure you want to delete "${name}"?`,
    "Delete",
    onConfirm,
  );
}
