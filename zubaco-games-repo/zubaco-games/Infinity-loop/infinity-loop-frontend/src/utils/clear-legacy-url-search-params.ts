/** Query keys that are no longer read by the app but may linger in bookmarks or old links. */
const LEGACY_URL_SEARCH_PARAM_KEYS = ["stage-id", "stageId"] as const;

/**
 * Strips legacy search params (e.g. `?stage-id=…`) from the current URL without navigation.
 * Safe to call on the server (no-op).
 */
export function clearLegacyUrlSearchParams(): boolean {
  if (globalThis.window === undefined) {
    return false;
  }

  const url = new URL(globalThis.window.location.href);
  let changed = false;

  for (const key of LEGACY_URL_SEARCH_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  globalThis.window.history.replaceState(
    globalThis.window.history.state,
    "",
    nextUrl,
  );
  return true;
}
