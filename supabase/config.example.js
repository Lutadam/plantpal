import { createClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "../utils/largeSecureStore";

// Copy this file to supabase/config.js and fill in your own Supabase project's values.
// Find these in the Supabase dashboard: Project Settings > API.
const supabaseUrl = "YOUR_SUPABASE_PROJECT_URL";
const supabaseKey = "YOUR_SUPABASE_PUBLISHABLE_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: LargeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
