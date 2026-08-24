import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  addPlantPhoto,
  deletePlant,
  getPlantPhotos,
  snoozePlant,
  updatePlant,
  waterPlant,
} from "../db/plantsDb";
import { pickImageWithHandlers } from "../utils/pickImage";
import {
  deletePlantPhotoFiles,
  uploadPlantPhoto,
  useSignedPhotoUrls,
} from "../utils/supabaseStorage";
import {
  DEFAULT_WATERING_INTERVAL_DAYS,
  getWateringStatus,
  severityColor,
} from "../utils/watering";
import { useTheme, typography } from "../utils/theme";
import { confirmDeletePlant } from "../utils/confirmDelete";
import { showGenericErrorAlert } from "../utils/alerts";
import { getSnoozeDays } from "../utils/notificationPrefs";
import { pluralize } from "../utils/pluralize";
import PlantForm from "./PlantForm";

export default function PlantDetailScreen({
  user,
  plant,
  onClose,
  onChanged,
  onDeleted,
}) {
  const theme = useTheme();
  const [currentPlant, setCurrentPlant] = useState(plant);
  const [photos, setPhotos] = useState([]);
  const [mode, setMode] = useState("view");

  const loadPhotos = useCallback(async () => {
    try {
      const rows = await getPlantPhotos(plant.id);
      setPhotos(rows);
    } catch (err) {
      showGenericErrorAlert();
    }
  }, [plant.id]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const photoUrlMap = useSignedPhotoUrls([
    currentPlant.photoUri,
    ...photos.map((photo) => photo.photoUri),
  ]);

  const status = getWateringStatus(currentPlant);
  const wateringIntervalDays =
    currentPlant.wateringIntervalDays || DEFAULT_WATERING_INTERVAL_DAYS;

  const handleWaterNow = async () => {
    try {
      await waterPlant(currentPlant.id, user.uid);
      setCurrentPlant((prev) => ({
        ...prev,
        lastWateredAt: new Date().toISOString(),
      }));
      onChanged?.();
    } catch (err) {
      showGenericErrorAlert();
    }
  };

  const handleSnooze = async () => {
    try {
      const days = await getSnoozeDays();
      const snoozedUntil = await snoozePlant(currentPlant.id, user.uid, days);
      setCurrentPlant((prev) => ({ ...prev, snoozedUntil }));
      onChanged?.();
    } catch (err) {
      showGenericErrorAlert();
    }
  };

  const handleEditSubmit = async ({ photoChanged, photoUri, ...values }) => {
    const uploadedPath =
      photoChanged && photoUri
        ? await uploadPlantPhoto(user.uid, photoUri)
        : photoUri;
    const nextValues = { ...values, photoUri: uploadedPath };
    await updatePlant(currentPlant.id, user.uid, nextValues);
    setCurrentPlant((prev) => ({ ...prev, ...nextValues }));
    setMode("view");
    onChanged?.();
  };

  const handleDelete = () => {
    confirmDeletePlant(currentPlant.name, async () => {
      try {
        const photoPaths = [
          currentPlant.photoUri,
          ...photos.map((p) => p.photoUri),
        ];
        await Promise.all([
          deletePlant(currentPlant.id, user.uid),
          deletePlantPhotoFiles(photoPaths),
        ]);
        onDeleted?.();
        onClose?.();
      } catch (err) {
        showGenericErrorAlert();
      }
    });
  };

  const addProgressPhoto = (source) =>
    pickImageWithHandlers(source, {
      onPermissionDenied: () =>
        Alert.alert("Permission required", "Please allow access to continue."),
      onPicked: async (uri) => {
        try {
          const uploadedPath = await uploadPlantPhoto(user.uid, uri);
          await addPlantPhoto(currentPlant.id, uploadedPath);
          loadPhotos();
        } catch (err) {
          showGenericErrorAlert();
        }
      },
    });

  const handleAddPhoto = () => {
    Alert.alert("Add Progress Photo", undefined, [
      { text: "Take Photo", onPress: () => addProgressPhoto("camera") },
      {
        text: "Choose from Library",
        onPress: () => addProgressPhoto("library"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={mode === "edit" ? () => setMode("view") : onClose}
        >
          <Ionicons
            name={mode === "edit" ? "arrow-back" : "close"}
            size={26}
            color={theme.iconMuted}
          />
        </TouchableOpacity>
        <Text
          style={[
            typography.navTitle,
            styles.headerTitle,
            { color: theme.text },
          ]}
          numberOfLines={1}
        >
          {mode === "edit" ? "Edit Plant" : currentPlant.name}
        </Text>
        {mode === "view" ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setMode("edit")}
              style={styles.headerButton}
            >
              <Ionicons name="pencil" size={22} color={theme.iconMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerButton}
            >
              <Ionicons name="trash" size={22} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {mode === "edit" ? (
        <PlantForm
          initialValues={currentPlant}
          existingPhotoDisplayUrl={photoUrlMap[currentPlant.photoUri]}
          submitLabel="Save Changes"
          savingLabel="Saving..."
          onSubmit={handleEditSubmit}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {photoUrlMap[currentPlant.photoUri] ? (
            <Image
              source={{ uri: photoUrlMap[currentPlant.photoUri] }}
              style={styles.hero}
            />
          ) : (
            <View
              style={[
                styles.heroPlaceholder,
                { backgroundColor: theme.surface },
              ]}
            >
              <Ionicons
                name="leaf-outline"
                size={48}
                color={theme.placeholderIcon}
              />
            </View>
          )}

          {currentPlant.species ? (
            <Text
              style={[
                typography.body,
                styles.species,
                { color: theme.textSecondary },
              ]}
            >
              {currentPlant.species}
            </Text>
          ) : null}

          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusLabel,
                { color: severityColor(theme, status.severity) },
              ]}
            >
              {status.label}
            </Text>
            <View style={styles.actionButtons}>
              {!status.snoozed ? (
                <TouchableOpacity
                  style={[
                    styles.snoozeButton,
                    { borderColor: theme.inputBorder },
                  ]}
                  onPress={handleSnooze}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[
                      typography.button,
                      styles.snoozeButtonText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Snooze
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.waterButton, { backgroundColor: theme.primary }]}
                onPress={handleWaterNow}
              >
                <Ionicons name="water" size={18} color={theme.onPrimary} />
                <Text
                  style={[
                    typography.button,
                    styles.waterButtonText,
                    { color: theme.onPrimary },
                  ]}
                >
                  Water Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text
            style={[
              typography.subtext,
              styles.detailText,
              { color: theme.textSecondary },
            ]}
          >
            Watering every {wateringIntervalDays}{" "}
            {pluralize(wateringIntervalDays, "day")}
          </Text>

          <View style={styles.timelineHeader}>
            <Text style={[typography.sectionTitle, { color: theme.text }]}>
              Growth Photos
            </Text>
            <TouchableOpacity onPress={handleAddPhoto}>
              <Ionicons name="add-circle" size={26} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <Text
              style={[
                typography.subtext,
                styles.emptyPhotos,
                { color: theme.textMuted },
              ]}
            >
              No progress photos yet. Tap + to add one.
            </Text>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => String(item.id)}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={styles.photoRow}
              renderItem={({ item }) => (
                <View style={styles.photoTile}>
                  <Image
                    source={{ uri: photoUrlMap[item.photoUri] }}
                    style={[
                      styles.photoImage,
                      { backgroundColor: theme.surface },
                    ]}
                  />
                  <Text style={[styles.photoDate, { color: theme.textMuted }]}>
                    {new Date(item.takenAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    marginLeft: 12,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  species: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  snoozeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  snoozeButtonText: {
    marginLeft: 4,
    fontSize: 14,
  },
  waterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  waterButtonText: {
    marginLeft: 6,
  },
  detailText: {
    marginBottom: 24,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  emptyPhotos: {
    textAlign: "center",
    marginTop: 16,
  },
  photoRow: {
    gap: 8,
  },
  photoTile: {
    flex: 1 / 3,
    marginBottom: 12,
    marginRight: 8,
  },
  photoImage: {
    width: "100%",
    height: 90,
    borderRadius: 10,
  },
  photoDate: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
});
