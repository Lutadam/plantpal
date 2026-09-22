import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { supabase } from "../supabase/config";
import { getPlants } from "../db/plantsDb";
import {
  cancelAllWateringNotifications,
  refreshWateringSchedule,
} from "./notifications";
import { getCurrentUserId } from "./currentUser";
import { getNotificationsEnabled } from "./notificationPrefs";

const TASK_NAME = "plantpal-watering-check";

// Reminders are handed to the OS as dated notifications ahead of time, so they
// fire with the app closed. This refreshes that window from the latest plant
// data. It runs on app open and after any change to a plant, and the background
// task below repeats it opportunistically — the OS only runs background work
// when it feels like it (and not at all on some Android skins once the app is
// swiped away), so nothing depends on it having run.
async function refreshFromServer() {
  const userId = await getCurrentUserId();
  if (!userId) return BackgroundTask.BackgroundTaskResult.Success;

  // Postgres RLS returns an empty (not erroring) result set for a query made
  // without a valid session, which would otherwise look identical to "no
  // plants" and wrongly clear an already-correct schedule. Bail out before
  // querying if the session isn't actually usable.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return BackgroundTask.BackgroundTaskResult.Failed;

  await refreshWateringSchedule(await getPlants(userId));
  return BackgroundTask.BackgroundTaskResult.Success;
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (!(await getNotificationsEnabled())) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    return await refreshFromServer();
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerWateringBackgroundTask() {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (registered) return;
  await BackgroundTask.registerTaskAsync(TASK_NAME, {
    minimumInterval: 60 * 12,
  });
}

export async function unregisterWateringBackgroundTask() {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!registered) return;
  await BackgroundTask.unregisterTaskAsync(TASK_NAME);
}

// Re-derives the scheduled reminders from a plant list the caller already has.
// Safe to call often; it replaces the pending notifications wholesale.
export async function syncWateringReminders(plants) {
  if (!(await getNotificationsEnabled())) return;
  await registerWateringBackgroundTask();
  await refreshWateringSchedule(plants);
}

// Same, but fetches the plants itself — for callers without the list to hand
// (enabling the switch, or changing the reminder time).
export async function runWateringCheckNow() {
  await refreshFromServer();
}

export async function disableWateringReminders() {
  await unregisterWateringBackgroundTask();
  await cancelAllWateringNotifications();
}
