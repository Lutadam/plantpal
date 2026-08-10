import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/config';
import { deletePlant, getPlants, waterPlant } from '../db/plantsDb';
import { getWateringStatus } from '../utils/watering';
import PlantDetailScreen from './PlantDetailScreen';

function PlantCard({ plant, onPress, onWaterNow, onDelete }) {
  const status = getWateringStatus(plant);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(plant)}>
      {plant.photoUri ? (
        <Image source={{ uri: plant.photoUri }} style={styles.cardPhoto} />
      ) : (
        <View style={styles.cardIcon}>
          <Ionicons name="leaf" size={24} color="#2e7d32" />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{plant.name}</Text>
        {plant.species ? (
          <Text style={styles.cardSpecies}>{plant.species}</Text>
        ) : null}
        <Text style={[styles.cardStatus, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.waterButton}
          onPress={() => onWaterNow(plant.id)}
        >
          <Ionicons name="water" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onDelete(plant)}
        >
          <Ionicons name="trash" size={18} color="#c62828" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ user }) {
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

  const handleWaterNow = async (plantId) => {
    await waterPlant(plantId);
    loadPlants();
  };

  const handleDelete = (plant) => {
    Alert.alert(
      'Delete plant',
      `Are you sure you want to delete "${plant.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlant(plant.id);
            loadPlants();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plants</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={26} color="#2e7d32" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#2e7d32" />
      ) : plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={48} color="#bdbdbd" />
          <Text style={styles.emptyText}>No plants yet</Text>
          <Text style={styles.emptySubtext}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  loading: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#616161',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  cardSpecies: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterButton: {
    backgroundColor: '#2e7d32',
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
