import i18n from "./i18n";

export const DEFAULT_WATERING_INTERVAL_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

export function wateringIntervalDays(plant) {
  return plant.wateringIntervalDays || DEFAULT_WATERING_INTERVAL_DAYS;
}

// The moment this plant next needs water. A snooze wins over the interval, and
// a plant that has never been watered is due immediately. Used both for the
// on-screen status and for pre-scheduling reminders with the OS.
export function getNextWateringDate(plant) {
  if (plant.snoozedUntil && new Date(plant.snoozedUntil) > new Date()) {
    return new Date(plant.snoozedUntil);
  }
  if (!plant.lastWateredAt) return new Date();
  return new Date(
    new Date(plant.lastWateredAt).getTime() +
      wateringIntervalDays(plant) * DAY_MS,
  );
}

export function getWateringStatus(plant) {
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

  const nextWatering = getNextWateringDate(plant);
  const daysUntil = Math.ceil((nextWatering - new Date()) / DAY_MS);

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
