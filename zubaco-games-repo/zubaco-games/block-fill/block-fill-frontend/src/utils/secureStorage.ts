import { importKeyFromHex } from '@/utils/payloadCrypto';
import { stringToBytes, bytesToString, bytesToBase64, base64ToBytes } from '@/utils/base64';
import { appEnv } from '@/app/config/env';

type EncryptedEntry = { iv: string; ciphertext: string; tag: string };

const memCache = new Map<string, string>();

/**
 * Returns the AES-256 hex key when encryption is enabled, otherwise undefined.
 *
 * @returns {string | undefined} The configured hex key when encryption is on.
 */
function getHexKey(): string | undefined {
  return appEnv.gamePayloadEncryptionEnabled
    ? appEnv.gamePayloadEncryptionKey || undefined
    : undefined;
}

/**
 * Returns whether `localStorage` can be used (guards SSR and test environments).
 *
 * @returns {boolean} True when `window` and `localStorage` are available.
 */
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Returns whether the value matches the encrypted localStorage entry shape.
 *
 * @param {unknown} value - The parsed or raw candidate value.
 *
 * @returns {value is EncryptedEntry} True when `iv`, `ciphertext`, and `tag` are strings.
 */
function isEncryptedEntry(value: unknown): value is EncryptedEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.iv === 'string' && typeof v.ciphertext === 'string' && typeof v.tag === 'string';
}

/**
 * Encrypts a plain string with AES-256-GCM.
 *
 * @param {string} plaintext - The string to encrypt.
 * @param {string} hexKey - 64-character hex AES-256 key.
 *
 * @returns {Promise<EncryptedEntry>} IV, ciphertext, and auth tag (base64).
 */
async function encryptString(plaintext: string, hexKey: string): Promise<EncryptedEntry> {
  const key = await importKeyFromHex(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    key,
    stringToBytes(plaintext) as BufferSource,
  );
  const bytes = new Uint8Array(encrypted);
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(bytes.slice(0, -16)),
    tag: bytesToBase64(bytes.slice(-16)),
  };
}

/**
 * Decrypts an AES-256-GCM entry back to a plain string.
 *
 * @param {EncryptedEntry} entry - The encrypted entry with `iv`, `ciphertext`, and `tag`.
 * @param {string} hexKey - 64-character hex AES-256 key.
 *
 * @returns {Promise<string>} The decrypted UTF-8 string.
 */
async function decryptString(entry: EncryptedEntry, hexKey: string): Promise<string> {
  const key = await importKeyFromHex(hexKey);
  const iv = base64ToBytes(entry.iv);
  const ciphertext = base64ToBytes(entry.ciphertext);
  const tag = base64ToBytes(entry.tag);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    key,
    combined as BufferSource,
  );
  return bytesToString(new Uint8Array(decrypted));
}

/**
 * Persists a string to `localStorage`, encrypting when a key is configured; falls back to plaintext on error.
 *
 * @param {string} storageKey - The `localStorage` key.
 * @param {string} value - The string value to write.
 *
 * @returns {Promise<void>} Resolves when the write completes (no throw on encrypt fallback).
 */
async function writeEncrypted(storageKey: string, value: string): Promise<void> {
  if (!canUseStorage()) return;
  const hexKey = getHexKey();
  if (!hexKey) {
    localStorage.setItem(storageKey, value);
    return;
  }
  try {
    const entry = await encryptString(value, hexKey);
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    localStorage.setItem(storageKey, value);
  }
}

/**
 * Returns the cached (pre-decrypted) value for the given key, or null if absent.
 * The cache is filled by {@link initSecureStorage} and updated by {@link secureSetItem}.
 *
 * @param {string} storageKey - The `localStorage` key.
 *
 * @returns {string | null} The cached plaintext, or null.
 */
export function secureGetItem(storageKey: string): string | null {
  return memCache.get(storageKey) ?? null;
}

/**
 * Sets the in-memory cache synchronously and writes the encrypted form to `localStorage` asynchronously.
 *
 * @param {string} storageKey - The `localStorage` key.
 * @param {string} value - The plaintext string to store.
 *
 * @returns {void}
 */
export function secureSetItem(storageKey: string, value: string): void {
  memCache.set(storageKey, value);
  void writeEncrypted(storageKey, value);
}

/**
 * Removes a key from the in-memory cache and from `localStorage`.
 *
 * @param {string} storageKey - The key to remove.
 *
 * @returns {void}
 */
export function secureRemoveItem(storageKey: string): void {
  memCache.delete(storageKey);
  if (canUseStorage()) {
    localStorage.removeItem(storageKey);
  }
}

/**
 * Clears the in-memory secure-storage cache (e.g. alongside `localStorage.clear()` in tests).
 *
 * @returns {void}
 */
export function clearSecureStorageCache(): void {
  memCache.clear();
}

/**
 * Pre-decrypts configured keys from `localStorage` into the in-memory cache before the app reads them synchronously.
 * Migrates legacy plaintext values to encrypted form when encryption is enabled.
 *
 * @param {readonly string[]} keys - The `localStorage` keys to hydrate.
 *
 * @returns {Promise<void>} Resolves when all keys have been processed.
 */
export async function initSecureStorage(keys: readonly string[]): Promise<void> {
  if (!canUseStorage()) return;
  const hexKey = getHexKey();

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    if (!hexKey) {
      // Encryption disabled — value is always plain text, skip JSON.parse
      memCache.set(key, raw);
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isEncryptedEntry(parsed)) {
        const decrypted = await decryptString(parsed, hexKey);
        memCache.set(key, decrypted);
      } else {
        // Plaintext from before encryption was enabled — cache and re-encrypt
        memCache.set(key, raw);
        void writeEncrypted(key, raw);
      }
    } catch {
      // Corrupt or unreadable — discard
      localStorage.removeItem(key);
    }
  }
}
