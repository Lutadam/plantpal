# PlantPal

A plant-care tracker built with Expo (SDK 57) and React Native. Log your plants, track watering schedules, keep a growth photo timeline, and get watering reminders for the plants that actually need it.

## Features

- Email/password auth with email verification and optional TOTP two-factor authentication (Supabase Auth)
- Plant data stored in Supabase Postgres (synced across devices on the same account, RLS-scoped per user); plant and growth photos stored in a private Supabase Storage bucket, accessed via time-limited signed URLs
- Requires network access — there is no offline/local data store
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

   - Copy `supabase/config.example.js` to `supabase/config.js` and fill in your project's URL and publishable key (Project Settings > API).
   - The app uses a custom URL scheme (`plantpal://`, set in `app.json`) so that password-reset emails can deep-link back into the app. This scheme is registered at native build time, so any existing development/production build made before adding it must be rebuilt (`eas build`) — a Metro/JS reload alone is not enough.

3. Start the app:

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
- expo-image-picker + expo-file-system (photo capture/upload)
- expo-notifications (local notifications), expo-task-manager + expo-background-task (periodic background watering checks), @react-native-community/datetimepicker (reminder time picker)
