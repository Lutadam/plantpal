import i18n from "./i18n";

export const DEFAULT_WATERING_INTERVAL_DAYS = 7;

export function getWateringStatus(plant) {
  const intervalDays =
    plant.wateringIntervalDays || DEFAULT_WATERING_INTERVAL_DAYS;

  if (plant.snoozedUntil && new Date(plant.snoozedUntil) > new Date()) {
    const date = new Date(plant.snoozedUntil).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return {
      label: i18n.t("watering.snoozedUntil", { date }),
      severity: "ok",
      snoozed: true,
    };
  }

  if (!plant.lastWateredAt) {
    return { label: i18n.t("watering.neverWatered"), severity: "danger" };
  }

  const lastWatered = new Date(plant.lastWateredAt);
  const nextWatering = new Date(
    lastWatered.getTime() + intervalDays * 24 * 60 * 60 * 1000,
  );
  const daysUntil = Math.ceil(
    (nextWatering - new Date()) / (24 * 60 * 60 * 1000),
  );

  if (daysUntil <= 0) {
    return {
      label:
        daysUntil === 0
          ? i18n.t("watering.waterToday")
          : i18n.t("watering.overdue", { days: Math.abs(daysUntil) }),
      severity: "danger",
    };
  }
  if (daysUntil === 1) {
    return { label: i18n.t("watering.waterTomorrow"), severity: "warning" };
  }
  return {
    label: i18n.t("watering.waterIn", { days: daysUntil }),
    severity: "ok",
  };
}

export function isDue(plant) {
  return getWateringStatus(plant).severity === "danger";
}

export function severityColor(theme, severity) {
  if (severity === "danger") return theme.danger;
  if (severity === "warning") return theme.warning;
  return theme.primary;
}
