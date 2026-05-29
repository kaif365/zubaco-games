export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  tag: string;
}

const keyCache = new Map<string, CryptoKey>();

async function importKeyFromHex(hexKey: string): Promise<CryptoKey> {
  const cached = keyCache.get(hexKey);
  if (cached) return cached;

  if (!hexKey || hexKey.length !== 64) {
    throw new Error('Encryption key must be a 64-character hex string (32 bytes)');
  }

  const bytes = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) {
    bytes[i / 2] = parseInt(hexKey.substring(i, i + 2), 16);
  }

  const key = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

  keyCache.set(hexKey, key);
  return key;
}

export async function encryptPayload(data: unknown, hexKey: string): Promise<EncryptedPayload> {
  const key = await importKeyFromHex(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plaintext);

  const bytes = new Uint8Array(encrypted);
  return {
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(bytes.slice(0, -16)),
    tag: uint8ToBase64(bytes.slice(-16)),
  };
}

export async function decryptPayload(payload: EncryptedPayload, hexKey: string): Promise<unknown> {
  const key = await importKeyFromHex(hexKey);
  const iv = base64ToUint8(payload.iv);
  const ciphertext = base64ToUint8(payload.ciphertext);
  const tag = base64ToUint8(payload.tag);

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, combined);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.iv === 'string' && typeof v.ciphertext === 'string' && typeof v.tag === 'string';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
