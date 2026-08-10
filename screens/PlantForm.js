import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { savePlantPhoto } from '../utils/photoStorage';

export default function PlantForm({
  initialValues,
  submitLabel,
  savingLabel,
  onSubmit,
}) {
  const [name, setName] = useState(initialValues?.name || '');
  const [species, setSpecies] = useState(initialValues?.species || '');
  const [wateringIntervalDays, setWateringIntervalDays] = useState(
    String(initialValues?.wateringIntervalDays || 7)
  );
  const [photoUri, setPhotoUri] = useState(initialValues?.photoUri || null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter a plant name.');
      return;
    }

    const interval = parseInt(wateringIntervalDays, 10);
    if (!interval || interval <= 0) {
      setError('Watering interval must be a positive number of days.');
      return;
    }

    setSaving(true);
    try {
      const savedPhotoUri = photoChanged
        ? photoUri
          ? savePlantPhoto(photoUri)
          : null
        : photoUri;

      await onSubmit({
        name: name.trim(),
        species: species.trim(),
        wateringIntervalDays: interval,
        photoUri: savedPhotoUri,
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="leaf-outline" size={32} color="#bdbdbd" />
          </View>
        )}
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={18} color="#2e7d32" />
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleChooseFromLibrary}
          >
            <Ionicons name="images" size={18} color="#2e7d32" />
            <Text style={styles.photoButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Plant name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Species (optional)"
        value={species}
        onChangeText={setSpecies}
      />
      <TextInput
        style={styles.input}
        placeholder="Watering interval (days)"
        keyboardType="number-pad"
        value={wateringIntervalDays}
        onChangeText={setWateringIntervalDays}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? savingLabel : submitLabel}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  photoButtons: {
    flex: 1,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  photoButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#c62828',
    marginBottom: 12,
    textAlign: 'center',
  },
});
