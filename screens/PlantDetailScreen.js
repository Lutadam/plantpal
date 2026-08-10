import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  addPlantPhoto,
  deletePlant,
  getPlantPhotos,
  updatePlant,
  waterPlant,
} from '../db/plantsDb';
import { savePlantPhoto } from '../utils/photoStorage';
import { getWateringStatus } from '../utils/watering';
import PlantForm from './PlantForm';

export default function PlantDetailScreen({ plant, onClose, onChanged, onDeleted }) {
  const [currentPlant, setCurrentPlant] = useState(plant);
  const [photos, setPhotos] = useState([]);
  const [mode, setMode] = useState('view');

  const loadPhotos = useCallback(async () => {
    const rows = await getPlantPhotos(plant.id);
    setPhotos(rows);
  }, [plant.id]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const status = getWateringStatus(currentPlant);

  const handleWaterNow = async () => {
    await waterPlant(currentPlant.id);
    setCurrentPlant((prev) => ({
      ...prev,
      lastWateredAt: new Date().toISOString(),
    }));
    onChanged?.();
  };

  const handleEditSubmit = async (values) => {
    await updatePlant(currentPlant.id, values);
    setCurrentPlant((prev) => ({ ...prev, ...values }));
    setMode('view');
    onChanged?.();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete plant',
      `Are you sure you want to delete "${currentPlant.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlant(currentPlant.id);
            onDeleted?.();
            onClose?.();
          },
        },
      ]
    );
  };

  const pickPhoto = async (fromCamera) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }
    const launch = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ quality: 0.6, allowsEditing: true });
    if (!result.canceled) {
      const savedUri = savePlantPhoto(result.assets[0].uri);
      await addPlantPhoto(currentPlant.id, savedUri);
      loadPhotos();
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Progress Photo', undefined, [
      { text: 'Take Photo', onPress: () => pickPhoto(true) },
      { text: 'Choose from Library', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={26} color="#616161" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {mode === 'edit' ? 'Edit Plant' : currentPlant.name}
        </Text>
        {mode === 'view' ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setMode('edit')} style={styles.headerButton}>
              <Ionicons name="pencil" size={22} color="#616161" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash" size={22} color="#c62828" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {mode === 'edit' ? (
        <PlantForm
          initialValues={currentPlant}
          submitLabel="Save Changes"
          savingLabel="Saving..."
          onSubmit={handleEditSubmit}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {currentPlant.photoUri ? (
            <Image source={{ uri: currentPlant.photoUri }} style={styles.hero} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="leaf-outline" size={48} color="#bdbdbd" />
            </View>
          )}

          {currentPlant.species ? (
            <Text style={styles.species}>{currentPlant.species}</Text>
          ) : null}

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: status.color }]}>
              {status.label}
            </Text>
            <TouchableOpacity style={styles.waterButton} onPress={handleWaterNow}>
              <Ionicons name="water" size={18} color="#fff" />
              <Text style={styles.waterButtonText}>Water Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailText}>
            Watering every {currentPlant.wateringIntervalDays || 7} day
            {(currentPlant.wateringIntervalDays || 7) === 1 ? '' : 's'}
          </Text>

          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>Growth Photos</Text>
            <TouchableOpacity onPress={handleAddPhoto}>
              <Ionicons name="add-circle" size={26} color="#2e7d32" />
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <Text style={styles.emptyPhotos}>
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
                  <Image source={{ uri: item.photoUri }} style={styles.photoImage} />
                  <Text style={styles.photoDate}>
                    {new Date(item.takenAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}
        </ScrollView>
      )}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 12,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  hero: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  species: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  waterButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  emptyPhotos: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
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
    width: '100%',
    height: 90,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  photoDate: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 4,
    textAlign: 'center',
  },
});
