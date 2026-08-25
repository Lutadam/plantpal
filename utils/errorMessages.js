import i18n from "./i18n";

// Best-effort classification of a caught error into something we can give the
// user an actionable message for, instead of always saying "something went
// wrong." Covers the failure modes that actually show up across Supabase
// Auth/Postgres/Storage calls and plain fetch calls in React Native.
export function classifyError(err) {
  const message = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    err?.name === "AuthRetryableFetchError"
  ) {
    return "network";
  }
  if (
    err?.status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit")
  ) {
    return "rate-limited";
  }
  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "permission-denied";
  }
  if (err?.status === 404 || code === "pgrst116" || message.includes("not found")) {
    return "not-found";
  }
  return "unknown";
}

export function getErrorMessage(err) {
  switch (classifyError(err)) {
    case "network":
      return i18n.t("errors.network");
    case "rate-limited":
      return i18n.t("errors.rateLimited");
    case "permission-denied":
      return i18n.t("errors.permissionDenied");
    case "not-found":
      return i18n.t("errors.notFound");
    default:
      return i18n.t("errors.generic");
  }
}
