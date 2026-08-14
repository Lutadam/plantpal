export function getWateringStatus(plant) {
  const intervalDays = plant.wateringIntervalDays || 7;

  if (!plant.lastWateredAt) {
    return { label: 'Never watered', severity: 'danger' };
  }

  const lastWatered = new Date(plant.lastWateredAt);
  const nextWatering = new Date(
    lastWatered.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );
  const daysUntil = Math.ceil((nextWatering - new Date()) / (24 * 60 * 60 * 1000));

  if (daysUntil <= 0) {
    return {
      label: daysUntil === 0 ? 'Water today' : `Overdue ${Math.abs(daysUntil)}d`,
      severity: 'danger',
    };
  }
  if (daysUntil === 1) {
    return { label: 'Water tomorrow', severity: 'warning' };
  }
  return { label: `Water in ${daysUntil}d`, severity: 'ok' };
}

export function severityColor(theme, severity) {
  if (severity === 'danger') return theme.danger;
  if (severity === 'warning') return theme.warning;
  return theme.primary;
}
