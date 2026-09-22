import Constants from "expo-constants";
import { supabase } from "../supabase/config";

function parseParams(url) {
  const params = {};
  const idx = url.search(/[?#]/);
  if (idx === -1) return params;
  const raw = url.slice(idx + 1).replace(/#/g, "&");
  raw.split("&").forEach((pair) => {
    if (!pair) return;
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");
  });
  return params;
}

function appUrl(path) {
  const scheme = Constants.expoConfig?.scheme || "plantpal";
  return `${scheme}://${path}`;
}

export function getPasswordResetRedirectUrl() {
  return appUrl("reset-password");
}

// Without this, Supabase sends the confirmation link to the project's Site URL
// (localhost by default) instead of back into the app. Both URLs must also be
// listed under Authentication → URL Configuration → Redirect URLs, or Supabase
// ignores them and falls back to the Site URL anyway.
export function getEmailConfirmRedirectUrl() {
  return appUrl("confirm-email");
}

async function establishSession(params) {
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return !error;
  }
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    return !error;
  }
  return false;
}

// Returns "recovery" when the link is a password reset (the caller has to show
// the new-password screen), "signedIn" when it was an email confirmation that
// left the user logged in, or null when the URL isn't an auth link at all.
export async function handleAuthDeepLink(url) {
  if (!url) return null;
  const params = parseParams(url);
  if (!params.type && !params.code) return null;

  const established = await establishSession(params);
  if (!established) return null;
  return params.type === "recovery" ? "recovery" : "signedIn";
}
