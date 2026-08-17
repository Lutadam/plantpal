import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { getPlants } from '../db/plantsDb';
import { isDue } from './watering';
import { scheduleWateringAlert } from './notifications';
import { getCurrentUserId } from './currentUser';
import { getPreferredNotifyHour } from './notificationPrefs';

const TASK_NAME = 'plantpal-watering-check';

// Background tasks tick roughly every 15+ min around the clock (the OS
// decides exactly when), so we only actually let a notification through
// during the hour the user picked in Settings. `force` skips that gate for
// an immediate, user-triggered check (e.g. right after enabling the setting).
async function checkAndNotify({ force = false } = {}) {
  const userId = await getCurrentUserId();
  if (!userId) return BackgroundTask.BackgroundTaskResult.Success;

  if (!force) {
    const preferredHour = await getPreferredNotifyHour();
    if (new Date().getHours() !== preferredHour) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
  }

  const plants = await getPlants(userId);
  const duePlants = plants.filter(isDue);
  await scheduleWateringAlert(duePlants);
  return BackgroundTask.BackgroundTaskResult.Success;
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    return await checkAndNotify();
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerWateringBackgroundTask() {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (registered) return;
  await BackgroundTask.registerTaskAsync(TASK_NAME, {
    minimumInterval: 15,
  });
}

export async function unregisterWateringBackgroundTask() {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!registered) return;
  await BackgroundTask.unregisterTaskAsync(TASK_NAME);
}

// Runs the same check immediately (e.g. right after the user enables the
// setting, so they don't have to wait for the first background tick).
export async function runWateringCheckNow() {
  await checkAndNotify({ force: true });
}
