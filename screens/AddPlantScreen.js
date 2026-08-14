import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addPlant } from '../db/plantsDb';
import { useTheme } from '../utils/theme';
import PlantForm from './PlantForm';

export default function AddPlantScreen({ user, onAdded }) {
  const theme = useTheme();

  const handleSubmit = async (values) => {
    await addPlant(user.uid, values);
    onAdded?.();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <Text style={[styles.title, { color: theme.primary }]}>Add Plant</Text>
      <PlantForm
        submitLabel="Add Plant"
        savingLabel="Adding..."
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: -8,
  },
});
