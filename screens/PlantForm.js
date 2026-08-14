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
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '../utils/pickImage';
import { savePlantPhoto } from '../utils/photoStorage';
import { useTheme } from '../utils/theme';

export default function PlantForm({
  initialValues,
  submitLabel,
  savingLabel,
  onSubmit,
}) {
  const theme = useTheme();
  const [name, setName] = useState(initialValues?.name || '');
  const [species, setSpecies] = useState(initialValues?.species || '');
  const [wateringIntervalDays, setWateringIntervalDays] = useState(
    String(initialValues?.wateringIntervalDays || 7)
  );
  const [photoUri, setPhotoUri] = useState(initialValues?.photoUri || null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = async (source) => {
    const { error, uri } = await pickImage(source);
    if (error) {
      setError(
        source === 'camera'
          ? 'Camera permission is required to take a photo.'
          : 'Photo library permission is required to choose a photo.'
      );
      return;
    }
    if (uri) {
      setPhotoUri(uri);
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
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}

      <View style={styles.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: theme.surface }]}>
            <Ionicons name="leaf-outline" size={32} color={theme.placeholderIcon} />
          </View>
        )}
        <View style={styles.photoButtons}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handlePickPhoto('camera')}
          >
            <Ionicons name="camera" size={18} color={theme.primary} />
            <Text style={[styles.photoButtonText, { color: theme.primary }]}>
              Take Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handlePickPhoto('library')}
          >
            <Ionicons name="images" size={18} color={theme.primary} />
            <Text style={[styles.photoButtonText, { color: theme.primary }]}>
              Choose Photo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          { borderColor: theme.inputBorder, color: theme.text },
        ]}
        placeholder="Plant name"
        placeholderTextColor={theme.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.inputBorder, color: theme.text },
        ]}
        placeholder="Species (optional)"
        placeholderTextColor={theme.textMuted}
        value={species}
        onChangeText={setSpecies}
      />
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.inputBorder, color: theme.text },
        ]}
        placeholder="Watering interval (days)"
        placeholderTextColor={theme.textMuted}
        keyboardType="number-pad"
        value={wateringIntervalDays}
        onChangeText={setWateringIntervalDays}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    marginBottom: 12,
    textAlign: 'center',
  },
});
