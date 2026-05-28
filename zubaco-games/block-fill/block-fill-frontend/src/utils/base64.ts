/**
 * UTF-8-encodes a string as bytes.
 *
 * @param {string} value - The plain string to encode.
 *
 * @returns {Uint8Array} The UTF-8 byte sequence.
 */
export function stringToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/**
 * Decodes UTF-8 bytes to a string.
 *
 * @param {Uint8Array} bytes - The byte sequence to decode.
 *
 * @returns {string} The decoded string.
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Converts an even-length hex string to bytes; accepts an optional `0x` prefix.
 *
 * @param {string} hex - Even-length hexadecimal string (e.g. 32-byte AES key).
 *
 * @returns {Uint8Array} The raw bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '').trim();
  if (!clean || clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('Invalid hex character');
    }
    out[i / 2] = byte;
  }
  return out;
}

/**
 * Encodes raw bytes as standard base64.
 *
 * @param {Uint8Array} bytes - The bytes to encode.
 *
 * @returns {string} Base64-encoded string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Decodes a standard base64 string to bytes.
 *
 * @param {string} b64 - The base64 input.
 *
 * @returns {Uint8Array} The decoded bytes.
 */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
