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

## Tech stack

- Expo SDK 57 / React Native
- Firebase Auth
- expo-sqlite (local data), expo-image-picker + expo-file-system (photos), expo-notifications (reminders)
