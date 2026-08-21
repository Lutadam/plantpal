const SPECIES_WATERING_DAYS = {
  succulent: 14,
  cactus: 21,
  aloe: 21,
  "snake plant": 21,
  "zz plant": 21,
  pothos: 7,
  fern: 3,
  monstera: 7,
  "spider plant": 7,
  "peace lily": 5,
  orchid: 7,
  basil: 2,
  mint: 2,
  herb: 4,
  "fiddle leaf fig": 7,
};

export function getPresetIntervalDays(species) {
  const query = (species || "").trim().toLowerCase();
  if (!query) return null;

  if (SPECIES_WATERING_DAYS[query] !== undefined) {
    return SPECIES_WATERING_DAYS[query];
  }

  const match = Object.keys(SPECIES_WATERING_DAYS).find(
    (key) => query.includes(key) || key.includes(query),
  );
  return match ? SPECIES_WATERING_DAYS[match] : null;
}
