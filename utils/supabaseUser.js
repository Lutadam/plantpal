import { supabase } from "../supabase/config";

export function toAppUser(session) {
  if (!session?.user) return null;
  return {
    uid: session.user.id,
    email: session.user.email,
    emailVerified: !!session.user.email_confirmed_at,
  };
}

export async function needsMfaChallenge() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
