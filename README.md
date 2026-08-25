# PlantPal

A plant-care tracker built with Expo (SDK 57) and React Native. Log your plants, track watering schedules, keep a growth photo timeline, and get watering reminders for the plants that actually need it.

## Features

- Email/password auth with email verification and optional TOTP two-factor authentication (Supabase Auth)
- Plant data stored in Supabase Postgres (synced across devices on the same account, RLS-scoped per user); plant and growth photos stored in a private Supabase Storage bucket, accessed via time-limited signed URLs
- Auth session (access/refresh tokens) is AES-encrypted at rest, with the encryption key held in the OS Keychain/Keystore (`expo-secure-store`), instead of being stored as plain text
- Requires network access — there is no offline/local data store; failures are classified (network-unreachable vs. generic) instead of always showing one blanket error, and the AI chat further distinguishes rate-limit/invalid-key/no-key cases
- Add/edit/delete plants with name, species, watering interval, and cover photo
- Species auto-suggestion from a plant's photo via the PlantNet identification API (only fills in the species field if it's still empty, never overwrites what you typed)
- AI plant-care chat (Gemini): a general "Chat" tab for open plant-care questions, plus a per-plant chat scoped to that plant's name/species/watering interval, accessible from a plant's detail screen. History is saved per user (and per plant, for plant-scoped chats) in Supabase
- English, Spanish, French, and Hindi UI, auto-detected from the device language with a manual override in Settings
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

2. Set up Supabase:
   - Create a project at [supabase.com](https://supabase.com/) and enable **Authentication > Email** (confirm-email on by default) and **Authentication > MFA (TOTP)**.
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
   - The app uses a custom URL scheme (`plantpal://`, set in `app.json`) so that password-reset emails can deep-link back into the app. This scheme is registered at native build time, so any existing development/production build made before adding it must be rebuilt (`eas build`) — a Metro/JS reload alone is not enough.
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

   Everything except watering reminders works in Expo Go. Background watering checks (`expo-task-manager` / `expo-background-task`) and the reminder-time picker (`@react-native-community/datetimepicker`) are native modules Expo Go doesn't include, so testing those requires an EAS development build:

   ```sh
   eas build --profile development
   ```

## Two-factor authentication recovery

Supabase's TOTP MFA has no built-in backup/recovery codes. If a user loses their authenticator app (lost phone, uninstalled app, etc.) after enabling 2FA, they can still log in with their password but will be stuck at the 6-digit code prompt with no way to disable MFA from inside the app — the app warns about this before a user turns 2FA on.

The only way to recover such an account is for the project admin to remove the stuck user's MFA factor from the Supabase dashboard:

1. Go to **SQL Editor** in the Supabase dashboard.
2. Find the user's factor: `select id, factor_type, status from auth.mfa_factors where user_id = (select id from auth.users where email = '<their email>');`
3. Delete it: `delete from auth.mfa_factors where id = '<factor id from above>';`
4. The user can now log in with just their password, and re-enroll 2FA if they want.

## Tech stack

- Expo SDK 57 / React Native
- Supabase Auth (email/password + TOTP MFA), Supabase Postgres (plant data, RLS-scoped), and Supabase Storage (private bucket, signed URLs)
- expo-image-picker + expo-file-system (photo capture/upload) + expo-image-manipulator (caps photos to 1600px on the longest side before upload)
- expo-notifications (local notifications), expo-task-manager + expo-background-task (periodic background watering checks), @react-native-community/datetimepicker (reminder time picker)
- expo-secure-store + aes-js + react-native-get-random-values (encrypted auth session storage, `utils/largeSecureStore.js`)
- i18next + react-i18next + expo-localization (multi-language UI, `utils/i18n.js`)
- PlantNet API (species identification from photos, `utils/plantId.js`)
- Gemini API (AI plant-care chat, `utils/gemini.js`), chat history in Supabase Postgres (`db/chatDb.js`)
