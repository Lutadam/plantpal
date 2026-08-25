import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const MAX_DIMENSION = 1600;

async function capDimensions(uri, width, height) {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return uri;
  }
  const resize =
    width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION };
  const result = await manipulateAsync(uri, [{ resize }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

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

  const asset = result.assets[0];
  const uri = await capDimensions(asset.uri, asset.width, asset.height);
  return { error: null, uri };
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
