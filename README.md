# PlantPal

A plant-care tracker built with Expo (SDK 57) and React Native. Log your plants, track watering schedules, keep a growth photo timeline, and get watering reminders for the plants that actually need it.

## Features

- Email/password auth with email verification and a dedicated forgot-password flow (Supabase Auth). Confirmation and reset emails deep-link back into the app rather than to a web page, and both prompts point users at their spam folder. "Resend confirmation email" only appears once it's relevant (just after registering, or after a login attempt fails on an unconfirmed address) and then enforces a visible 60-second cooldown
- Plant data stored in Supabase Postgres (synced across devices on the same account, RLS-scoped per user); plant and growth photos stored in a private Supabase Storage bucket, accessed via time-limited signed URLs
- Auth session (access/refresh tokens) is AES-encrypted at rest, with the encryption key held in the OS Keychain/Keystore (`expo-secure-store`), instead of being stored as plain text
- Requires network access — there is no offline/local data store; failures are classified (network-unreachable / rate-limited / permission-denied / not-found / generic) instead of always showing one blanket error, and the AI chat further distinguishes rate-limit/invalid-key/no-key cases
- Add/edit/delete plants with name, species, watering interval, and cover photo
- Species auto-suggestion from a plant's photo via the PlantNet identification API (only fills in the species field if it's still empty, never overwrites what you typed); distinguishes image-too-large, rate-limited, and network-error cases instead of failing silently
- AI plant-care chat (Gemini): a general "Chat" tab for open plant-care questions, plus a per-plant chat scoped to that plant's name/species/watering interval, accessible from a plant's detail screen. History is saved per user (and per plant, for plant-scoped chats) in Supabase
- English, Spanish, French, and Hindi UI, auto-detected from the device language with a manual override in Settings
- Per-plant growth photo timeline (take or pick photos over time)
- Watering status per plant (overdue / due today / due tomorrow / due later), shown with a color-coded badge on each plant card
- Watering reminder notifications that name the specific plants due for water (not a blanket daily ping), delivered at the exact time you pick with a native clock picker. Reminders are handed to the OS in advance as dated notifications, so they arrive whether or not the app is running — see [Watering reminders](#watering-reminders)
- Dark mode support, following the device's system theme
- Standardized in-app typography and a shared design system (`utils/theme.js`) across all screens. Button and link labels stretch to their container and centre their text rather than shrink-wrapping, so they don't get clipped mid-word when the platform draws glyphs wider than React Native measured them — which is what Android's "Bold text" accessibility setting does

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```
2. Set up Supabase:

   - Create a project at [supabase.com](https://supabase.com/) and enable **Authentication > Email** (confirm-email on by default).
   - Create a **private** Storage bucket named `plant-photos`, and add an RLS policy on `storage.objects` restricting access to each user's own folder:

     ```sql
     (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
     ```
   - Create the `plants` and `plant_photos` tables, with RLS policies scoping each user to their own rows, by running this in the SQL Editor:

     ```sql
     create table public.plants (
       id uuid primary key default gen_random_uuid(),
       "userId" uuid not null references auth.users(id) on delete cascade,
       name text not null,
       species text,
       "wateringIntervalDays" integer not null default 7,
       "lastWateredAt" timestamptz,
       "photoUri" text,
       "snoozedUntil" timestamptz,
       "createdAt" timestamptz not null default now()
     );

     create table public.plant_photos (
       id uuid primary key default gen_random_uuid(),
       "plantId" uuid not null references public.plants(id) on delete cascade,
       "photoUri" text not null,
       "takenAt" timestamptz not null default now()
     );

     alter table public.plants enable row level security;
     alter table public.plant_photos enable row level security;

     create policy "Users manage own plants" on public.plants
       for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

     create policy "Users manage own plant photos" on public.plant_photos
       for all using (
         exists (select 1 from public.plants p where p.id = "plantId" and p."userId" = auth.uid())
       ) with check (
         exists (select 1 from public.plants p where p.id = "plantId" and p."userId" = auth.uid())
       );
     ```
   - Create the `chat_messages` table (used by the AI chat feature) the same way:

     ```sql
     create table public.chat_messages (
       id uuid primary key default gen_random_uuid(),
       "userId" uuid not null references auth.users(id) on delete cascade,
       "plantId" uuid references public.plants(id) on delete cascade,
       role text not null check (role in ('user', 'assistant')),
       content text not null,
       "createdAt" timestamptz not null default now()
     );

     alter table public.chat_messages enable row level security;

     create policy "Users manage own chat messages" on public.chat_messages
       for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

     create index chat_messages_user_plant_idx
       on public.chat_messages ("userId", "plantId", "createdAt");
     ```

     `"plantId"` is `null` for messages sent from the general Chat tab, and set to a specific plant's id for messages sent from that plant's detail screen — both share this one table.
   - Copy `supabase/config.example.js` to `supabase/config.js` and fill in your project's URL and publishable key (Project Settings > API).
   - Under **Authentication > URL Configuration**, set **Site URL** to `plantpal://` and add both of these to the **Redirect URLs** allow-list:

     ```
     plantpal://reset-password
     plantpal://confirm-email
     ```

     Supabase silently ignores any `redirectTo` that isn't on this list and falls back to the Site URL, which defaults to `http://localhost:3000` — nothing is listening there on a phone, so confirmation and reset links open a dead browser page instead of the app.
   - Deliverability is worth setting up before real users: Supabase's built-in sender is a shared address with no domain authentication, so confirmation emails frequently land in spam. Configure your own SMTP sender under **Authentication > Emails > SMTP** with SPF and DKIM on a domain you control.
   - The app uses a custom URL scheme (`plantpal://`, set in `app.json`) so that confirmation and password-reset emails can deep-link back into the app. This scheme is registered at native build time, so any existing development/production build made before adding it must be rebuilt (`eas build`) — a Metro/JS reload alone is not enough. Deep links also don't resolve in Expo Go, which serves the app over its own `exp://` scheme.
   - The same applies to `expo-secure-store` (used for encrypted session storage, see `utils/largeSecureStore.js`) and `expo-localization` (used for device-language detection, see `utils/i18n.js`): both ship native code, so any dev-client build made before they were added needs a rebuild (`eas build --profile development`, or `npx expo prebuild && npx expo run:android`/`run:ios` for a local build) before they'll work — a plain `expo start` reload isn't enough.
3. Set up PlantNet (optional, for species auto-suggestion from photos):

   - Get a free API key at [my.plantnet.org](https://my.plantnet.org) (Getting started > API access).
   - Copy `plantnet/config.example.js` to `plantnet/config.js` and fill in your key. Without a real key here, the app just skips auto-identification and the species field stays manual-only.
4. Set up Gemini (optional, for the AI plant-care chat):

   - Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   - Copy `gemini/config.example.js` to `gemini/config.js` and fill in your key. Without a real key here, chat messages just get a generic error instead of a reply.
5. Start the app:

   ```sh
   npx expo start
   ```

   Everything except watering reminders and email deep links works in Expo Go. Reminder scheduling (`expo-task-manager` / `expo-background-task`), the reminder-time picker (`@react-native-community/datetimepicker`) and the `plantpal://` URL scheme all need native code Expo Go doesn't include, so testing those requires a real build:

   ```sh
   eas build --profile development --platform android   # dev client
   eas build --profile preview --platform android       # installable APKe
   ```

## Watering reminders

Reminders are **pre-scheduled**, not computed at delivery time. `refreshWateringSchedule()` in `utils/notifications.js` derives each plant's upcoming watering dates from `lastWateredAt + wateringIntervalDays` (or `snoozedUntil`), groups them by calendar day, and hands the OS one dated notification per day at the user's chosen hour and minute — up to 20 of them across a 30-day horizon, which keeps well inside iOS's 64-pending-notification cap. A plant that is already overdue rolls to the next reminder slot ahead rather than being dropped.

This matters because the OS then delivers reminders with the app fully closed, and re-arms them after a reboot or an app update (`expo-notifications` registers a `BOOT_COMPLETED` receiver for exactly this). The schedule is refreshed from `loadPlants()` in `screens/DashboardScreen.js` — which runs on open, on app resume, and after any change to a plant — and whenever the reminder time changes in Settings.

The `expo-background-task` task in `utils/wateringReminderTask.js` is only a backstop that re-runs the same refresh; nothing depends on it firing. Background execution is unreliable by design: iOS never runs it for a force-quit app, and most Android OEM skins (Xiaomi, Samsung, Huawei, Oppo, OnePlus) stop WorkManager jobs once the app is swiped away from recents. An earlier version of this app relied on that task to send notifications directly, which is why reminders did not arrive when the app was closed.

To verify delivery end-to-end: set the reminder time a few minutes ahead with at least one plant due, return to the plant list once (this is what hands the reminder to the OS), then fully close the app.

Android's own battery management is the most common real-world cause of a missed reminder — not a bug in the scheduling code. The app declares `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` (`app.json`) so the OS treats these as exact alarms rather than fuzzy/batched ones, but an OEM's more aggressive battery saver (e.g. "Battery saver (recommended)" on some devices, which closes or restricts background apps outright) can still suppress delivery regardless of that permission. Settings shows an in-app hint for this (Android only, when reminders are enabled) linking to the app's system settings page, since the user has to opt the app out of battery restriction themselves — there's no way to do it programmatically.

## Tech stack

- Expo SDK 57 / React Native
- Supabase Auth (email/password), Supabase Postgres (plant data, RLS-scoped), and Supabase Storage (private bucket, signed URLs)
- expo-image-picker + expo-file-system (photo capture/upload) + expo-image-manipulator (caps photos to 1600px on the longest side before upload)
- expo-notifications (dated local notifications scheduled ahead of time, exact alarms via `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`), expo-task-manager + expo-background-task (backstop refresh of that schedule), @react-native-community/datetimepicker (reminder time picker, 24-hour format)
- expo-secure-store + aes-js + react-native-get-random-values (encrypted auth session storage, `utils/largeSecureStore.js`)
- i18next + react-i18next + expo-localization (multi-language UI, `utils/i18n.js`)
- PlantNet API (species identification from photos, `utils/plantId.js`)
- Gemini API (AI plant-care chat, `utils/gemini.js`), chat history in Supabase Postgres (`db/chatDb.js`)
