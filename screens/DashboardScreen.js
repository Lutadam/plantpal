import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  deletePlant,
  getPlantPhotos,
  getPlants,
  waterPlant,
} from "../db/plantsDb";
import { getWateringStatus, severityColor } from "../utils/watering";
import { useTheme, typography } from "../utils/theme";
import { confirmDeletePlant } from "../utils/confirmDelete";
import { showGenericErrorAlert } from "../utils/alerts";
import {
  deletePlantPhotoFiles,
  useSignedPhotoUrls,
} from "../utils/supabaseStorage";
import PlantDetailScreen from "./PlantDetailScreen";

function filterPlants(plants, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return plants;
  return plants.filter(
    (plant) =>
      plant.name.toLowerCase().includes(normalized) ||
      (plant.species || "").toLowerCase().includes(normalized),
  );
}

function PlantCard({ plant, photoUrl, theme, onPress, onWaterNow, onDelete }) {
  const status = getWateringStatus(plant);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        theme.shadow,
        {
          backgroundColor: theme.card,
          borderLeftColor: severityColor(theme, status.severity),
        },
        theme.mode === "dark" && {
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: theme.border,
          borderRightColor: theme.border,
          borderBottomColor: theme.border,
        },
      ]}
      onPress={() => onPress(plant)}
      activeOpacity={0.7}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.cardPhoto} />
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="leaf" size={24} color={theme.primary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={[typography.label, { color: theme.text }]}>
          {plant.name}
        </Text>
        {plant.species ? (
          <Text
            style={[
              typography.subtext,
              styles.cardSpecies,
              { color: theme.textSecondary },
            ]}
          >
            {plant.species}
          </Text>
        ) : null}
        <Text
          style={[
            styles.cardStatus,
            { color: severityColor(theme, status.severity) },
          ]}
        >
          {status.label}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.waterButton,
            theme.shadow,
            { backgroundColor: theme.primary },
          ]}
          onPress={() => onWaterNow(plant.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="water" size={20} color={theme.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onDelete(plant)}
        >
          <Ionicons name="trash" size={18} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ user }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPlants = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const rows = await getPlants(user.uid);
      setPlants(rows);
    } catch (err) {
      showGenericErrorAlert(err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "background" && nextState === "active") {
        loadPlants();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [loadPlants]);

  const photoUrlMap = useSignedPhotoUrls(plants.map((plant) => plant.photoUri));

  const overdueCount = plants.filter(
    (plant) => getWateringStatus(plant).severity === "danger",
  ).length;

  const filteredPlants = filterPlants(plants, searchQuery);

  const handleWaterNow = async (plantId) => {
    try {
      await waterPlant(plantId, user.uid);
      loadPlants();
    } catch (err) {
      showGenericErrorAlert(err);
    }
  };

  const handleDelete = (plant) => {
    confirmDeletePlant(plant.name, async () => {
      try {
        const growthPhotos = await getPlantPhotos(plant.id);
        const photoPaths = [
          plant.photoUri,
          ...growthPhotos.map((p) => p.photoUri),
        ];
        await deletePlant(plant.id, user.uid);
        await deletePlantPhotoFiles(photoPaths);
        loadPlants();
      } catch (err) {
        showGenericErrorAlert(err);
      }
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[typography.screenTitle, { color: theme.text }]}>
          {t("dashboard.title")}
        </Text>
      </View>

      {overdueCount > 0 ? (
        <View
          style={[
            styles.banner,
            theme.shadow,
            { backgroundColor: theme.dangerBg },
          ]}
        >
          <View style={[styles.bannerIcon, { backgroundColor: theme.danger }]}>
            <Ionicons name="water" size={16} color={theme.onPrimary} />
          </View>
          <Text
            style={[
              typography.label,
              styles.bannerText,
              { color: theme.danger },
            ]}
          >
            {t("dashboard.overdueBanner", { count: overdueCount })}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator
          style={styles.loading}
          size="large"
          color={theme.primary}
        />
      ) : plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="leaf-outline"
            size={48}
            color={theme.placeholderIcon}
          />
          <Text
            style={[
              typography.sectionTitle,
              styles.emptyText,
              { color: theme.textSecondary },
            ]}
          >
            {t("dashboard.emptyTitle")}
          </Text>
          <Text
            style={[
              typography.subtext,
              styles.emptySubtext,
              { color: theme.textMuted },
            ]}
          >
            {t("dashboard.emptySubtitle")}
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: theme.surface,
                borderColor: theme.inputBorder,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t("dashboard.searchPlaceholder")}
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredPlants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color={theme.placeholderIcon} />
              <Text
                style={[
                  typography.sectionTitle,
                  styles.emptyText,
                  { color: theme.textSecondary },
                ]}
              >
                {t("dashboard.noMatches")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPlants}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <PlantCard
                  plant={item}
                  photoUrl={photoUrlMap[item.photoUri]}
                  theme={theme}
                  onPress={setSelectedPlant}
                  onWaterNow={handleWaterNow}
                  onDelete={handleDelete}
                />
              )}
            />
          )}
        </>
      )}

      <Modal
        visible={!!selectedPlant}
        animationType="slide"
        onRequestClose={() => setSelectedPlant(null)}
      >
        {selectedPlant ? (
          <PlantDetailScreen
            user={user}
            plant={selectedPlant}
            onClose={() => setSelectedPlant(null)}
            onChanged={loadPlants}
            onDeleted={loadPlants}
          />
        ) : null}
      </Modal>
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
  loading: {
    marginTop: 40,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    padding: 0,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardSpecies: {
    marginTop: 2,
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  waterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
