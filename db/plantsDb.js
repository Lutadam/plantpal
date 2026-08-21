import { supabase } from "../supabase/config";

export async function getPlants(userId) {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPlant(
  userId,
  { name, species, wateringIntervalDays, photoUri },
) {
  const { data, error } = await supabase
    .from("plants")
    .insert({
      userId,
      name,
      species: species || null,
      wateringIntervalDays: wateringIntervalDays || 7,
      photoUri: photoUri || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updatePlant(
  id,
  { name, species, wateringIntervalDays, photoUri },
) {
  const { error } = await supabase
    .from("plants")
    .update({
      name,
      species: species || null,
      wateringIntervalDays: wateringIntervalDays || 7,
      photoUri: photoUri || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function waterPlant(id) {
  const { error } = await supabase
    .from("plants")
    .update({ lastWateredAt: new Date().toISOString(), snoozedUntil: null })
    .eq("id", id);
  if (error) throw error;
}

export async function snoozePlant(id, days = 1) {
  const snoozedUntil = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await supabase
    .from("plants")
    .update({ snoozedUntil })
    .eq("id", id);
  if (error) throw error;
  return snoozedUntil;
}

export async function deletePlant(id) {
  const { error } = await supabase.from("plants").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllPlantsForUser(userId) {
  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("id, photoUri")
    .eq("userId", userId);
  if (plantsError) throw plantsError;

  const plantIds = plants.map((plant) => plant.id);
  let photoRows = [];
  if (plantIds.length > 0) {
    const { data, error } = await supabase
      .from("plant_photos")
      .select("photoUri")
      .in("plantId", plantIds);
    if (error) throw error;
    photoRows = data;
  }

  const deletedPhotoPaths = [
    ...plants.map((plant) => plant.photoUri).filter(Boolean),
    ...photoRows.map((photo) => photo.photoUri).filter(Boolean),
  ];

  const { error: deleteError } = await supabase
    .from("plants")
    .delete()
    .eq("userId", userId);
  if (deleteError) throw deleteError;

  return { deletedPhotoPaths };
}

export async function getPlantPhotos(plantId) {
  const { data, error } = await supabase
    .from("plant_photos")
    .select("*")
    .eq("plantId", plantId)
    .order("takenAt", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPlantPhoto(plantId, photoUri) {
  const { error } = await supabase
    .from("plant_photos")
    .insert({ plantId, photoUri });
  if (error) throw error;
}

export async function deletePlantPhoto(id) {
  const { error } = await supabase.from("plant_photos").delete().eq("id", id);
  if (error) throw error;
}
