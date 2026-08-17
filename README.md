# PlantPal

A plant-care tracker built with Expo (SDK 57) and React Native. Log your plants, track watering schedules, keep a growth photo timeline, and get watering reminders for the plants that actually need it.

## Features

- Email/password auth with email verification (Firebase Auth)
- Local plant data and photo history stored on-device (`expo-sqlite`, no Firestore required)
- Add/edit/delete plants with name, species, watering interval, and cover photo
- Per-plant growth photo timeline (take or pick photos over time)
- Watering status per plant (overdue / due today / due tomorrow / due later), shown with a color-coded badge on each plant card
- Watering reminder notifications that name the specific plants due for water, checked periodically in the background (not a blanket daily ping) at a time you pick with a native clock picker
- Dark mode support, following the device's system theme
- Standardized in-app typography and a shared design system (`utils/theme.js`) across all screens

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```
2. Set up Firebase:

   - Create a project at [Firebase console](https://console.firebase.google.com/) and enable **Authentication > Email/Password**.
   - Copy `firebase/config.example.js` to `firebase/config.js` and fill in your project's config values (Project settings > General > Your apps).
3. Start the app:

   ```sh
   npx expo start
   ```

   Everything except watering reminders works in Expo Go. Background watering checks (`expo-task-manager` / `expo-background-task`) and the reminder-time picker (`@react-native-community/datetimepicker`) are native modules Expo Go doesn't include, so testing those requires an EAS development build:

   ```sh
   eas build --profile development
   ```

## Tech stack

- Expo SDK 57 / React Native
- Firebase Auth
- expo-sqlite (local data), expo-image-picker + expo-file-system (photos)
- expo-notifications (local notifications), expo-task-manager + expo-background-task (periodic background watering checks), @react-native-community/datetimepicker (reminder time picker)
