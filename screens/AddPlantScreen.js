import { Text, View, StyleSheet } from 'react-native';
import { addPlant } from '../db/plantsDb';
import PlantForm from './PlantForm';

export default function AddPlantScreen({ user, onAdded }) {
  const handleSubmit = async (values) => {
    await addPlant(user.uid, values);
    onAdded?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Plant</Text>
      <PlantForm
        submitLabel="Add Plant"
        savingLabel="Adding..."
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: -8,
    color: '#2e7d32',
  },
});
