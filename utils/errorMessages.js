import i18n from "./i18n";

// Best-effort classification of a caught error into something we can give the
// user an actionable message for, instead of always saying "something went
// wrong." Network failures are the one category reliably detectable across
// both Supabase and plain fetch calls in React Native.
export function classifyError(err) {
  const message = String(err?.message || "").toLowerCase();
  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    err?.name === "AuthRetryableFetchError"
  ) {
    return "network";
  }
  return "unknown";
}

export function getErrorMessage(err) {
  return classifyError(err) === "network"
    ? i18n.t("errors.network")
    : i18n.t("errors.generic");
}
