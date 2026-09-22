import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import {
  getNotificationPermissionStatus,
  isNotificationsAvailable,
  requestNotificationPermission,
} from "./notifications";

// One entry per permission the app actually requests somewhere, for the
// Settings > Permissions dashboard. `check` never prompts; `request` does
// (and is only offered while the OS will still show a prompt at all — once
// denied a second time, Android and iOS stop asking and the only way back is
// the system Settings app).
export const PERMISSIONS = [
  {
    key: "camera",
    labelKey: "permissions.camera",
    descriptionKey: "permissions.cameraDescription",
    check: () => ImagePicker.getCameraPermissionsAsync(),
    request: () => ImagePicker.requestCameraPermissionsAsync(),
  },
  {
    key: "mediaLibrary",
    labelKey: "permissions.mediaLibrary",
    descriptionKey: "permissions.mediaLibraryDescription",
    check: () => ImagePicker.getMediaLibraryPermissionsAsync(),
    request: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
  },
  {
    key: "notifications",
    labelKey: "permissions.notifications",
    descriptionKey: "permissions.notificationsDescription",
    // Not available at all in Expo Go — see isNotificationsAvailable's caller.
    unavailable: !isNotificationsAvailable(),
    check: () => getNotificationPermissionStatus(),
    request: async () => ({ granted: await requestNotificationPermission() }),
  },
];

export function openAppSettings() {
  Linking.openSettings();
}
