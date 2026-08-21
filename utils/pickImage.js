import * as ImagePicker from "expo-image-picker";

export async function pickImage(source) {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: "permission" };
  }

  const launch =
    source === "camera"
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
  const result = await launch({ quality: 0.6, allowsEditing: true });
  if (result.canceled) {
    return { error: null, uri: null };
  }
  return { error: null, uri: result.assets[0].uri };
}

export async function pickImageWithHandlers(
  source,
  { onPermissionDenied, onPicked },
) {
  const { error, uri } = await pickImage(source);
  if (error) {
    onPermissionDenied?.();
    return;
  }
  if (uri) {
    onPicked?.(uri);
  }
}
