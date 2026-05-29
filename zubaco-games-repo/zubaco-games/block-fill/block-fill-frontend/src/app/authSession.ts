import { secureGetItem, secureSetItem, secureRemoveItem } from '@/utils/secureStorage';

export const AUTH_STORAGE_KEY = 'ZUBACO_user_auth_session';

export interface UserProfile {
  id: string;
  name: string;
}

export interface UserAuthSession {
  token: string;
  expiresAt: string;
  stageId: string;
  user: UserProfile;
}

/**
 * Returns whether browser storage APIs are available.
 *
 * @returns {boolean} True in a browser with `localStorage`.
 */
function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Reads and parses the persisted auth session, or null if missing or invalid.
 *
 * @returns {UserAuthSession | null} The stored session, or null.
 */
export function getStoredAuthSession() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = secureGetItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UserAuthSession;
    if (!parsed.token || !parsed.expiresAt) {
      secureRemoveItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    secureRemoveItem(AUTH_STORAGE_KEY);
    return null;
  }
}

/**
 * Returns whether the session expiry is in the future.
 *
 * @param {UserAuthSession} session - The session to validate.
 *
 * @returns {boolean} True when `expiresAt` parses to a future instant.
 */
export function isAuthSessionValid(session: UserAuthSession) {
  const expiryMs = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiryMs)) {
    return false;
  }
  return expiryMs > Date.now();
}

/**
 * Persists the auth session to secure storage.
 *
 * @param {UserAuthSession} session - The session to save.
 *
 * @returns {void}
 */
export function saveAuthSession(session: UserAuthSession) {
  if (!canUseStorage()) {
    return;
  }
  secureSetItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Removes the auth session from secure storage.
 *
 * @returns {void}
 */
export function clearAuthSession() {
  if (!canUseStorage()) {
    return;
  }
  secureRemoveItem(AUTH_STORAGE_KEY);
}

/**
 * Returns the bearer token for the current valid session, or null.
 *
 * @returns {string | null} JWT or opaque token string, or null.
 */
export function getAuthToken() {
  const session = getStoredAuthSession();
  if (!session || !isAuthSessionValid(session)) {
    return null;
  }
  return session.token;
}
