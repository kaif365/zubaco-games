import {
  base64ToBytes,
  bytesToBase64,
  hexToBytes,
  stringToBytes,
  bytesToString,
} from '@/utils/base64';

export type EncryptedPayload = {
  iv: string;
  ciphertext: string;
  tag: string;
};

// Importing a CryptoKey is expensive — cache per hex key for the session lifetime.
const keyCache = new Map<string, CryptoKey>();

/**
 * Imports a 64-character hex AES key for Web Crypto, with session-level caching.
 *
 * @param {string} hexKey - Raw 32-byte key as 64 hex characters.
 *
 * @returns {Promise<CryptoKey>} The AES-GCM crypto key.
 */
export async function importKeyFromHex(hexKey: string): Promise<CryptoKey> {
  const cached = keyCache.get(hexKey);
  if (cached) return cached;

  if (!hexKey || hexKey.length !== 64) {
    throw new Error('Encryption key must be a 64-character hex string (32 bytes)');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(hexKey) as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  keyCache.set(hexKey, key);
  return key;
}

/**
 * Encrypts a JSON-serializable value with AES-256-GCM.
 *
 * @param {unknown} data - The value to stringify and encrypt.
 * @param {string} hexKey - 64-character hex AES-256 key.
 *
 * @returns {Promise<EncryptedPayload>} IV, ciphertext, and auth tag (base64).
 */
export async function encryptPayload(data: unknown, hexKey: string): Promise<EncryptedPayload> {
  const key = await importKeyFromHex(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    key,
    stringToBytes(JSON.stringify(data)) as BufferSource,
  );

  // Web Crypto appends the 16-byte GCM auth tag at the end of the output.
  const bytes = new Uint8Array(encrypted);
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(bytes.slice(0, -16)),
    tag: bytesToBase64(bytes.slice(-16)),
  };
}

/**
 * Type guard for the encrypted payload shape used by the game API.
 *
 * @param {unknown} value - The value to check.
 *
 * @returns {value is EncryptedPayload} True when the value matches the payload shape.
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.iv === 'string' && typeof v.ciphertext === 'string' && typeof v.tag === 'string';
}

/**
 * Decrypts an encrypted payload and parses the inner JSON.
 *
 * @param {unknown} payload - The encrypted envelope or invalid input.
 * @param {string} hexKey - 64-character hex AES-256 key.
 *
 * @returns {Promise<unknown>} The parsed JSON value after decryption.
 */
export async function decryptPayload(payload: unknown, hexKey: string): Promise<unknown> {
  if (!isEncryptedPayload(payload)) {
    throw new Error('Invalid encrypted payload: expected { iv, ciphertext, tag }');
  }

  const key = await importKeyFromHex(hexKey);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const tag = base64ToBytes(payload.tag);

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    key,
    combined as BufferSource,
  );

  return JSON.parse(bytesToString(new Uint8Array(decrypted)));
}
