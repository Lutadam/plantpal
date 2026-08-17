import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { deletePlant, getPlants, waterPlant } from '../db/plantsDb';
import { getWateringStatus, severityColor } from '../utils/watering';
import { useTheme, typography } from '../utils/theme';
import { confirmDeletePlant } from '../utils/confirmDelete';
import { pluralize } from '../utils/pluralize';
import PlantDetailScreen from './PlantDetailScreen';

function PlantCard({ plant, theme, onPress, onWaterNow, onDelete }) {
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
        theme.mode === 'dark' && {
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
      {plant.photoUri ? (
        <Image source={{ uri: plant.photoUri }} style={styles.cardPhoto} />
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="leaf" size={24} color={theme.primary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={[typography.label, { color: theme.text }]}>{plant.name}</Text>
        {plant.species ? (
          <Text style={[typography.subtext, styles.cardSpecies, { color: theme.textSecondary }]}>
            {plant.species}
          </Text>
        ) : null}
        <Text
          style={[styles.cardStatus, { color: severityColor(theme, status.severity) }]}
        >
          {status.label}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.waterButton, theme.shadow, { backgroundColor: theme.primary }]}
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
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);

  const loadPlants = useCallback(async () => {
    if (!user?.uid) return;
    const rows = await getPlants(user.uid);
    setPlants(rows);
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        loadPlants();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [loadPlants]);

  const overdueCount = plants.filter(
    (plant) => getWateringStatus(plant).severity === 'danger'
  ).length;

  const handleWaterNow = async (plantId) => {
    await waterPlant(plantId);
    loadPlants();
  };

  const handleDelete = (plant) => {
    confirmDeletePlant(plant.name, async () => {
      await deletePlant(plant.id);
      loadPlants();
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[typography.screenTitle, { color: theme.text }]}>My Plants</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {overdueCount > 0 ? (
        <View style={[styles.banner, theme.shadow, { backgroundColor: theme.dangerBg }]}>
          <View style={[styles.bannerIcon, { backgroundColor: theme.danger }]}>
            <Ionicons name="water" size={16} color={theme.onPrimary} />
          </View>
          <Text style={[typography.label, styles.bannerText, { color: theme.danger }]}>
            {overdueCount} {pluralize(overdueCount, 'plant')}{' '}
            {pluralize(overdueCount, 'needs', 'need')} watering
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color={theme.primary} />
      ) : plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={48} color={theme.placeholderIcon} />
          <Text style={[typography.sectionTitle, styles.emptyText, { color: theme.textSecondary }]}>
            No plants yet
          </Text>
          <Text style={[typography.subtext, styles.emptySubtext, { color: theme.textMuted }]}>
            Add your first plant from the Add Plant tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PlantCard
              plant={item}
              theme={theme}
              onPress={setSelectedPlant}
              onWaterNow={handleWaterNow}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      <Modal
        visible={!!selectedPlant}
        animationType="slide"
        onRequestClose={() => setSelectedPlant(null)}
      >
        {selectedPlant ? (
          <PlantDetailScreen
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  loading: {
    marginTop: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
