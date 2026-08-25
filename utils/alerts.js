import { Alert } from "react-native";
import { getErrorMessage } from "./errorMessages";
import i18n from "./i18n";

export function showGenericErrorAlert(err) {
  Alert.alert(i18n.t("alerts.genericTitle"), getErrorMessage(err));
}

export function showExpoGoUnavailableAlert() {
  Alert.alert(
    i18n.t("alerts.expoGoUnavailableTitle"),
    i18n.t("alerts.expoGoUnavailableMessage"),
  );
}

export function showPermissionNeededAlert(message) {
  Alert.alert(i18n.t("alerts.permissionNeededTitle"), message);
}
