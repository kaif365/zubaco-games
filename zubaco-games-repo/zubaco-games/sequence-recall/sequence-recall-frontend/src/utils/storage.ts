import { STORAGE_KEYS } from '@/constants/storageKeys';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/encryption';
import { appConfig } from '@app/config/appConfig';

type StoredEncryptedValue = {
  encrypted: true;
  payload: unknown;
  version: 1;
};

/**
 * Checks whether record.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isRecord.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks whether stored encrypted value.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of isStoredEncryptedValue.
 */
function isStoredEncryptedValue(value: unknown): value is StoredEncryptedValue {
  return (
    isRecord(value) &&
    value.encrypted === true &&
    value.version === 1 &&
    'payload' in value &&
    isEncryptedPayload(value.payload)
  );
}

/**
 * Gets encryption key.
 *
 * @returns {string | null} The result of getEncryptionKey.
 */
function getEncryptionKey(): string | null {
  return appConfig.encryption.key || null;
}

/**
 * Decrypt stored value.
 *
 * @param {unknown} value - The value.
 *
 * @returns {Promise<T | null>} A promise that resolves with the result.
 */
async function decryptStoredValue<T>(value: unknown): Promise<T | null> {
  const key = getEncryptionKey();
  if (!key) return null;

  if (isStoredEncryptedValue(value)) {
    return (await decryptPayload(value.payload, key)) as T;
  }

  if (isEncryptedPayload(value)) {
    return (await decryptPayload(value, key)) as T;
  }

  return null;
}

/**
 * Parse stored value.
 *
 * @param {string} raw - The raw.
 *
 * @returns {Promise<T | null>} A promise that resolves with the result.
 */
async function parseStoredValue<T>(raw: string): Promise<T | null> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const decrypted = await decryptStoredValue<T>(parsed);
    return decrypted ?? (parsed as T);
  } catch {
    return raw as T;
  }
}

export const storage = {
  /**
   * Gets .
   *
   * @param {string} key - The key.
   *
   * @returns {unknown} The result of get.
   */
  get(key: string): unknown {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  /**
   * Sets .
   *
   * @param {string} key - The key.
   * @param {unknown} value - The value.
   *
   * @returns {void} No return value.
   */
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[storage] Failed to set key "${key}"`);
    }
  },

  /**
   * Gets secure.
   *
   * @param {string} key - The key.
   *
   * @returns {Promise<T | null>} A promise that resolves with the result.
   */
  async getSecure<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return await parseStoredValue<T>(item);
    } catch {
      return null;
    }
  },

  /**
   * Sets secure.
   *
   * @param {string} key - The key.
   * @param {unknown} value - The value.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async setSecure(key: string, value: unknown): Promise<void> {
    try {
      const encryptionKey = getEncryptionKey();
      if (!encryptionKey) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }

      const payload = await encryptPayload(value, encryptionKey);
      localStorage.setItem(
        key,
        JSON.stringify({
          encrypted: true,
          payload,
          version: 1,
        } satisfies StoredEncryptedValue),
      );
    } catch {
      console.warn(`[storage] Failed to securely set key "${key}"`);
    }
  },

  /**
   * Remove.
   *
   * @param {string} key - The key.
   *
   * @returns {void} No return value.
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * Clear.
   *
   * @returns {void} No return value.
   */
  clear(): void {
    localStorage.clear();
  },
};

/**
 * Clear auth storage.
 *
 * @returns {void} No return value.
 */
export function clearAuthStorage(): void {
  storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  storage.remove(STORAGE_KEYS.AUTH_EXPIRES_AT);
  storage.remove(STORAGE_KEYS.ACTIVE_GAME_SESSION);
}
