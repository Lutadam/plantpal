import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addPlant } from "../db/plantsDb";
import { uploadPlantPhoto } from "../utils/supabaseStorage";
import { useTheme, typography } from "../utils/theme";
import PlantForm from "./PlantForm";

export default function AddPlantScreen({ user, onAdded }) {
  const theme = useTheme();

  const handleSubmit = async ({ photoChanged, photoUri, ...values }) => {
    const uploadedPath =
      photoChanged && photoUri
        ? await uploadPlantPhoto(user.uid, photoUri)
        : null;
    await addPlant(user.uid, { ...values, photoUri: uploadedPath });
    onAdded?.();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <Text
        style={[typography.screenTitle, styles.title, { color: theme.text }]}
      >
        Add Plant
      </Text>
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
    textAlign: "center",
    marginTop: 24,
    marginBottom: -8,
  },
});
