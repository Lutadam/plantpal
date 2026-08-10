# PlantPal

A plant-care tracker built with Expo (SDK 57) and React Native. Log your plants, track watering schedules, keep a growth photo timeline, and get daily watering reminders.

## Features

- Email/password auth with email verification (Firebase Auth)
- Local plant data and photo history stored on-device (`expo-sqlite`, no Firestore required)
- Add/edit/delete plants with name, species, watering interval, and cover photo
- Per-plant growth photo timeline (take or pick photos over time)
- Watering status per plant (overdue / due today / due soon)
- Daily watering reminder notifications with a configurable time

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

## Notifications on Android

Since Expo SDK 53, Expo Go no longer supports `expo-notifications` on Android (importing it throws instead of just warning). The Settings screen detects this and disables the reminder toggle with an explanation when running in Expo Go on Android.

To use notifications on Android, build a [development client](https://docs.expo.dev/develop/development-builds/introduction/) instead:

```sh
npx eas-cli login
npx eas-cli build --profile development --platform android
```

Install the resulting APK on your device, then run:

```sh
npx expo start --dev-client
```

iOS Expo Go works without a development build (it only logs a warning for the same restriction).

## Tech stack

- Expo SDK 57 / React Native
- Firebase Auth
- expo-sqlite (local data), expo-image-picker + expo-file-system (photos), expo-notifications (reminders)
