import * as SQLite from 'expo-sqlite';

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('plantpal.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS plants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          species TEXT,
          wateringIntervalDays INTEGER NOT NULL DEFAULT 7,
          lastWateredAt TEXT,
          photoUri TEXT,
          createdAt TEXT NOT NULL
        );
      `);
      try {
        await db.execAsync('ALTER TABLE plants ADD COLUMN photoUri TEXT;');
      } catch {
        // column already exists
      }
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS plant_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plantId INTEGER NOT NULL,
          photoUri TEXT NOT NULL,
          takenAt TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function getPlants(userId) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM plants WHERE userId = ? ORDER BY createdAt DESC;',
    [userId]
  );
}

export async function addPlant(
  userId,
  { name, species, wateringIntervalDays, photoUri }
) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO plants (userId, name, species, wateringIntervalDays, photoUri, createdAt) VALUES (?, ?, ?, ?, ?, ?);',
    [userId, name, species || null, wateringIntervalDays || 7, photoUri || null, now]
  );
}

export async function updatePlant(
  id,
  { name, species, wateringIntervalDays, photoUri }
) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE plants SET name = ?, species = ?, wateringIntervalDays = ?, photoUri = ? WHERE id = ?;',
    [name, species || null, wateringIntervalDays || 7, photoUri || null, id]
  );
}

export async function waterPlant(id) {
  const db = await getDb();
  await db.runAsync('UPDATE plants SET lastWateredAt = ? WHERE id = ?;', [
    new Date().toISOString(),
    id,
  ]);
}

export async function deletePlant(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM plants WHERE id = ?;', [id]);
  await db.runAsync('DELETE FROM plant_photos WHERE plantId = ?;', [id]);
}

export async function getPlantPhotos(plantId) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM plant_photos WHERE plantId = ? ORDER BY takenAt DESC;',
    [plantId]
  );
}

export async function addPlantPhoto(plantId, photoUri) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO plant_photos (plantId, photoUri, takenAt) VALUES (?, ?, ?);',
    [plantId, photoUri, new Date().toISOString()]
  );
}

export async function deletePlantPhoto(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM plant_photos WHERE id = ?;', [id]);
}
