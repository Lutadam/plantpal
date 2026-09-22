import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { pickImageWithHandlers } from "../utils/pickImage";
import { useTheme, typography } from "../utils/theme";
import { DEFAULT_WATERING_INTERVAL_DAYS } from "../utils/watering";
import { getPresetIntervalDays } from "../utils/speciesPresets";
import { getErrorMessage } from "../utils/errorMessages";
import { identifySpecies } from "../utils/plantId";
import { useBackHandler } from "../utils/backHandler";

const NAME_MAX_LENGTH = 60;
const SPECIES_MAX_LENGTH = 60;
const MAX_WATERING_INTERVAL_DAYS = 365;

// `onCancel` is the default "go back" action once nothing needs saving —
// PlantDetailScreen passes returning to view mode, AddPlantScreen passes
// returning to the home tab. It runs directly when the form has no unsaved
// changes, or after the user picks "Discard" when it does. Exposed via ref so
// the header's own back arrow can share the same save/discard/keep-editing
// prompt as the hardware back button.
const PlantForm = forwardRef(function PlantForm(
  {
    initialValues,
    existingPhotoDisplayUrl,
    submitLabel,
    savingLabel,
    onSubmit,
    onCancel,
  },
  ref,
) {
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
  const speciesRef = useRef(species);
  const mountedRef = useRef(true);
  const identifyRequestRef = useRef(0);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [notAPlant, setNotAPlant] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Only asked when adding a new plant — an existing plant's watering history
  // is already tracked by "Water now" / snooze, so editing never touches it.
  const isAdding = !initialValues;
  const [lastWateredChoice, setLastWateredChoice] = useState("today");
  const [lastWateredDate, setLastWateredDate] = useState(new Date());
  const [lastWateredPickerOpen, setLastWateredPickerOpen] = useState(false);

  const initialSnapshotRef = useRef({
    name: initialValues?.name || "",
    species: initialValues?.species || "",
    interval: String(
      initialValues?.wateringIntervalDays || DEFAULT_WATERING_INTERVAL_DAYS,
    ),
  });

  useEffect(() => {
    speciesRef.current = species;
  }, [species]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        setNotAPlant(false);
        setError("");

        if (speciesRef.current.trim()) return;

        const requestId = ++identifyRequestRef.current;
        const isStale = () =>
          !mountedRef.current || requestId !== identifyRequestRef.current;

        setIdentifying(true);
        identifySpecies(uri)
          .then((result) => {
            if (isStale()) return;
            if (result.status === "no-match") {
              setNotAPlant(true);
              return;
            }
            if (result.status === "too-large") {
              setError(t("plantForm.identifyImageTooLarge"));
              return;
            }
            if (result.status === "rate-limited") {
              setError(t("plantForm.identifyRateLimited"));
              return;
            }
            if (result.status === "network-error") {
              setError(t("errors.network"));
              return;
            }
            if (result.status === "unavailable") {
              setError(t("plantForm.identifyUnavailable"));
              return;
            }
            if (result.status !== "matched" || speciesRef.current.trim()) {
              return;
            }
            const label = result.commonName || result.scientificName;
            if (!label) return;
            setSpecies(label);
            if (!intervalTouchedRef.current) {
              const preset = getPresetIntervalDays(label);
              if (preset) setWateringIntervalDays(String(preset));
            }
          })
          .finally(() => {
            if (!isStale()) setIdentifying(false);
          });
      },
    });

  function computeLastWateredAt() {
    if (!isAdding) return undefined;
    if (lastWateredChoice === "today") return new Date().toISOString();
    if (lastWateredChoice === "earlier") return lastWateredDate.toISOString();
    return null; // "not sure / not yet" — treated as never watered
  }

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
      const lastWateredAt = computeLastWateredAt();
      await onSubmit({
        name: trimmedName,
        species: trimmedSpecies,
        wateringIntervalDays: interval,
        photoChanged,
        photoUri: photoChanged ? photoUri : (initialValues?.photoUri ?? null),
        ...(lastWateredAt !== undefined ? { lastWateredAt } : {}),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  function isDirty() {
    return (
      name !== initialSnapshotRef.current.name ||
      species !== initialSnapshotRef.current.species ||
      wateringIntervalDays !== initialSnapshotRef.current.interval ||
      photoChanged ||
      (isAdding && lastWateredChoice !== "today")
    );
  }

  // Shared by the hardware back button and the header's back arrow (via ref),
  // so both offer the same choice instead of one silently discarding.
  function confirmBack() {
    if (!isDirty()) {
      onCancel?.();
      return;
    }
    Alert.alert(t("plantForm.discardTitle"), t("plantForm.discardMessage"), [
      { text: t("plantForm.discardKeepEditing"), style: "cancel" },
      {
        text: t("plantForm.discardDiscard"),
        style: "destructive",
        onPress: () => onCancel?.(),
      },
      { text: t("plantForm.discardSave"), onPress: () => handleSubmit() },
    ]);
  }

  useImperativeHandle(ref, () => ({ confirmBack, isDirty }));

  useBackHandler(() => {
    confirmBack();
    return true;
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text
            style={[
              typography.subtext,
              styles.error,
              { color: theme.danger },
            ]}
          >
            {error}
          </Text>
        ) : null}

        <View style={styles.photoRow}>
          {displayPhotoUrl ? (
            <View>
              <Image
                source={{ uri: displayPhotoUrl }}
                style={[styles.photoPreview, theme.shadow]}
              />
              <TouchableOpacity
                style={[
                  styles.photoClearButton,
                  { backgroundColor: theme.card },
                ]}
                onPress={() => {
                  setPhotoUri(null);
                  setPhotoChanged(true);
                  setNotAPlant(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
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

        {identifying ? (
          <Text
            style={[
              typography.subtext,
              styles.identifying,
              { color: theme.textMuted },
            ]}
          >
            {t("plantForm.identifying")}
          </Text>
        ) : null}

        {!identifying && notAPlant ? (
          <Text
            style={[
              typography.subtext,
              styles.identifying,
              { color: theme.textMuted },
            ]}
          >
            {t("plantForm.notAPlant")}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputRow,
            { borderColor: theme.inputBorder, backgroundColor: theme.surface },
          ]}
        >
          <TextInput
            style={[styles.inputField, { color: theme.text }]}
            placeholder={t("plantForm.namePlaceholder")}
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX_LENGTH}
          />
          {name ? (
            <TouchableOpacity onPress={() => setName("")}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View
          style={[
            styles.inputRow,
            { borderColor: theme.inputBorder, backgroundColor: theme.surface },
          ]}
        >
          <TextInput
            style={[styles.inputField, { color: theme.text }]}
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
          {species ? (
            <TouchableOpacity onPress={() => setSpecies("")}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
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
          placeholder={t("plantForm.intervalPlaceholder")}
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          value={wateringIntervalDays}
          onChangeText={(text) => {
            intervalTouchedRef.current = true;
            setWateringIntervalDays(text);
          }}
        />

        {isAdding ? (
          <View style={styles.lastWateredSection}>
            <Text
              style={[
                typography.label,
                styles.lastWateredLabel,
                { color: theme.text },
              ]}
            >
              {t("plantForm.lastWateredLabel")}
            </Text>
            <View style={styles.segmentGroup}>
              {[
                ["today", t("plantForm.lastWateredToday")],
                ["earlier", t("plantForm.lastWateredEarlier")],
                ["unknown", t("plantForm.lastWateredUnknown")],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor:
                        lastWateredChoice === value
                          ? theme.primary
                          : theme.surfaceAlt,
                    },
                  ]}
                  onPress={() => setLastWateredChoice(value)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color:
                          lastWateredChoice === value
                            ? theme.onPrimary
                            : theme.text,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {lastWateredChoice === "earlier" ? (
              <TouchableOpacity
                style={[styles.dateRow, { borderColor: theme.inputBorder }]}
                onPress={() => setLastWateredPickerOpen(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.textSecondary}
                />
                <Text style={[styles.dateRowText, { color: theme.text }]}>
                  {lastWateredDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ) : null}
            {lastWateredPickerOpen && (
              <DateTimePicker
                value={lastWateredDate}
                mode="date"
                maximumDate={new Date()}
                themeVariant={theme.mode}
                onValueChange={(event, date) => {
                  setLastWateredPickerOpen(Platform.OS === "ios");
                  if (date) setLastWateredDate(date);
                }}
                onDismiss={() => setLastWateredPickerOpen(false)}
              />
            )}
          </View>
        ) : null}

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default PlantForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  photoClearButton: {
    position: "absolute",
    top: -6,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
  identifying: {
    marginBottom: 12,
    marginTop: -8,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  lastWateredSection: {
    marginBottom: 20,
  },
  lastWateredLabel: {
    marginBottom: 10,
  },
  segmentGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  dateRowText: {
    marginLeft: 8,
    fontSize: 15,
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
