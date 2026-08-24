import { Alert } from "react-native";
import i18n from "./i18n";

export function confirmDestructiveAction(
  title,
  message,
  confirmLabel,
  onConfirm,
) {
  Alert.alert(title, message, [
    { text: i18n.t("confirmDelete.cancel"), style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export function confirmDeletePlant(name, onConfirm) {
  confirmDestructiveAction(
    i18n.t("confirmDelete.deletePlantTitle"),
    i18n.t("confirmDelete.deletePlantMessage", { name }),
    i18n.t("confirmDelete.delete"),
    onConfirm,
  );
}
