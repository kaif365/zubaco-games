import { STORAGE_KEYS } from '@/constants/storageKeys';
import { storage } from '@/utils/storage';

const TOKEN_PARAM_KEYS = ['token', 'auth_token', 'authToken', 'sessionToken'] as const;
const EXPIRES_PARAM_KEYS = ['expiresAt', 'expires_at', 'exp'] as const;

/**
 * Collects parameter sources from the launch URL (query string and hash
 * fragment). Hosts may pass the token in either location.
 *
 * @returns {URLSearchParams[]} The parsed parameter sources.
 */
function collectParamSources(): URLSearchParams[] {
  const sources: URLSearchParams[] = [];

  if (window.location.search.length > 1) {
    sources.push(new URLSearchParams(window.location.search));
  }

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (rawHash.includes('=')) {
    sources.push(new URLSearchParams(rawHash));
  }

  return sources;
}

/**
 * Returns the first non-empty value found for any of the given keys.
 *
 * @param {URLSearchParams[]} sources - The parameter sources.
 * @param {readonly string[]} keys - The keys to look up.
 *
 * @returns {string | null} The first matching value, or null.
 */
function firstParam(sources: URLSearchParams[], keys: readonly string[]): string | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = source.get(key);
      if (value) return value;
    }
  }
  return null;
}

/**
 * Removes the auth parameters from the address bar (query and hash) so the
 * short-lived token is not leaked through browser history or the referrer.
 *
 * @returns {void} No return value.
 */
function stripAuthParamsFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const allKeys = [...TOKEN_PARAM_KEYS, ...EXPIRES_PARAM_KEYS];

    for (const key of allKeys) url.searchParams.delete(key);

    if (url.hash.includes('=')) {
      const hashParams = new URLSearchParams(
        url.hash.startsWith('#') ? url.hash.slice(1) : url.hash,
      );
      for (const key of allKeys) hashParams.delete(key);
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
    }

    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Non-fatal: leaving params in the URL must never break startup.
  }
}

/**
 * Production authentication bootstrap.
 *
 * The ZUBACO host platform launches the embedded game with a short-lived JWT in
 * the launch URL (query string or hash fragment). This reads that token, stores
 * it for the Authorization header, and removes it from the address bar. The same
 * token then flows through the standard httpClient Bearer auth used by the
 * production backend. Returns true when a token was found and stored.
 *
 * @returns {Promise<boolean>} Whether a token was bootstrapped.
 */
export async function bootstrapAuthFromUrl(): Promise<boolean> {
  const sources = collectParamSources();
  if (sources.length === 0) return false;

  const token = firstParam(sources, TOKEN_PARAM_KEYS);
  if (!token) return false;

  const expiresAt = firstParam(sources, EXPIRES_PARAM_KEYS);

  await storage.setSecure(STORAGE_KEYS.AUTH_TOKEN, token);
  if (expiresAt) {
    await storage.setSecure(STORAGE_KEYS.AUTH_EXPIRES_AT, expiresAt);
  }

  stripAuthParamsFromUrl();
  return true;
}
