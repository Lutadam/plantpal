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

export function getPasswordResetRedirectUrl() {
  const scheme = Constants.expoConfig?.scheme || "plantpal";
  return `${scheme}://reset-password`;
}

export async function handlePasswordRecoveryUrl(url) {
  if (!url) return false;
  const params = parseParams(url);
  if (params.type !== "recovery") return false;

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
