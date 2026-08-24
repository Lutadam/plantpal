import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { pickImageWithHandlers } from "../utils/pickImage";
import { useTheme, typography } from "../utils/theme";
import { DEFAULT_WATERING_INTERVAL_DAYS } from "../utils/watering";
import { getPresetIntervalDays } from "../utils/speciesPresets";
import { getGenericErrorMessage } from "../utils/errorMessages";

const NAME_MAX_LENGTH = 60;
const SPECIES_MAX_LENGTH = 60;
const MAX_WATERING_INTERVAL_DAYS = 365;

export default function PlantForm({
  initialValues,
  existingPhotoDisplayUrl,
  submitLabel,
  savingLabel,
  onSubmit,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name || "");
  const [species, setSpecies] = useState(initialValues?.species || "");
  const [wateringIntervalDays, setWateringIntervalDays] = useState(
    String(
      initialValues?.wateringIntervalDays || DEFAULT_WATERING_INTERVAL_DAYS,
    ),
  );
  const intervalTouchedRef = useRef(!!initialValues);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const displayPhotoUrl = photoChanged ? photoUri : existingPhotoDisplayUrl;

  const handlePickPhoto = (source) =>
    pickImageWithHandlers(source, {
      onPermissionDenied: () =>
        setError(
          source === "camera"
            ? t("plantForm.cameraPermissionRequired")
            : t("plantForm.libraryPermissionRequired"),
        ),
      onPicked: (uri) => {
        setPhotoUri(uri);
        setPhotoChanged(true);
      },
    });

  const handleSubmit = async () => {
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("plantForm.errorNameRequired"));
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(t("plantForm.errorNameTooLong", { max: NAME_MAX_LENGTH }));
      return;
    }

    const trimmedSpecies = species.trim();
    if (trimmedSpecies.length > SPECIES_MAX_LENGTH) {
      setError(
        t("plantForm.errorSpeciesTooLong", { max: SPECIES_MAX_LENGTH }),
      );
      return;
    }

    const interval = parseInt(wateringIntervalDays, 10);
    if (!interval || interval <= 0 || interval > MAX_WATERING_INTERVAL_DAYS) {
      setError(
        t("plantForm.errorIntervalRange", {
          max: MAX_WATERING_INTERVAL_DAYS,
        }),
      );
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        species: trimmedSpecies,
        wateringIntervalDays: interval,
        photoChanged,
        photoUri: photoChanged ? photoUri : (initialValues?.photoUri ?? null),
      });
    } catch (err) {
      setError(getGenericErrorMessage());
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {error ? (
        <Text
          style={[typography.subtext, styles.error, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.photoRow}>
        {displayPhotoUrl ? (
          <Image
            source={{ uri: displayPhotoUrl }}
            style={[styles.photoPreview, theme.shadow]}
          />
        ) : (
          <View
            style={[
              styles.photoPlaceholder,
              theme.shadow,
              { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={32}
              color={theme.placeholderIcon}
            />
          </View>
        )}
        <View style={styles.photoButtons}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handlePickPhoto("camera")}
          >
            <Ionicons name="camera" size={18} color={theme.primary} />
            <Text style={[styles.photoButtonText, { color: theme.primary }]}>
              {t("plantForm.takePhoto")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handlePickPhoto("library")}
          >
            <Ionicons name="images" size={18} color={theme.primary} />
            <Text style={[styles.photoButtonText, { color: theme.primary }]}>
              {t("plantForm.choosePhoto")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          {
            borderColor: theme.inputBorder,
            backgroundColor: theme.surface,
            color: theme.text,
          },
        ]}
        placeholder={t("plantForm.namePlaceholder")}
        placeholderTextColor={theme.textMuted}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX_LENGTH}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: theme.inputBorder,
            backgroundColor: theme.surface,
            color: theme.text,
          },
        ]}
        placeholder={t("plantForm.speciesPlaceholder")}
        placeholderTextColor={theme.textMuted}
        value={species}
        onChangeText={(text) => {
          setSpecies(text);
          if (!intervalTouchedRef.current) {
            const preset = getPresetIntervalDays(text);
            if (preset) setWateringIntervalDays(String(preset));
          }
        }}
        maxLength={SPECIES_MAX_LENGTH}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: theme.inputBorder,
            backgroundColor: theme.surface,
            color: theme.text,
          },
        ]}
        placeholder={t("plantForm.intervalPlaceholder")}
        placeholderTextColor={theme.textMuted}
        keyboardType="number-pad"
        value={wateringIntervalDays}
        onChangeText={(text) => {
          intervalTouchedRef.current = true;
          setWateringIntervalDays(text);
        }}
      />

      <TouchableOpacity
        style={[
          styles.button,
          theme.shadow,
          { backgroundColor: theme.primary },
        ]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={[typography.button, { color: theme.onPrimary }]}>
          {saving ? savingLabel : submitLabel}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 16,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  photoButtons: {
    flex: 1,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
  },
  error: {
    marginBottom: 12,
    textAlign: "center",
  },
});
