export function getWateringStatus(plant) {
  const intervalDays = plant.wateringIntervalDays || 7;

  if (!plant.lastWateredAt) {
    return { label: 'Never watered', color: '#c62828' };
  }

  const lastWatered = new Date(plant.lastWateredAt);
  const nextWatering = new Date(
    lastWatered.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );
  const daysUntil = Math.ceil((nextWatering - new Date()) / (24 * 60 * 60 * 1000));

  if (daysUntil <= 0) {
    return {
      label: daysUntil === 0 ? 'Water today' : `Overdue ${Math.abs(daysUntil)}d`,
      color: '#c62828',
    };
  }
  if (daysUntil === 1) {
    return { label: 'Water tomorrow', color: '#f9a825' };
  }
  return { label: `Water in ${daysUntil}d`, color: '#2e7d32' };
}
