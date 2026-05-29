/**
 * Base64 to bytes.
 *
 * @param {string} base64 - The base64.
 *
 * @returns {Uint8Array<ArrayBufferLike>} The result of base64ToBytes.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Bytes to base64.
 *
 * @param {Uint8Array<ArrayBufferLike>} bytes - The bytes.
 *
 * @returns {string} The result of bytesToBase64.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Hex to bytes.
 *
 * @param {string} hex - The hex.
 *
 * @returns {Uint8Array<ArrayBufferLike>} The result of hexToBytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string: odd length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * String to bytes.
 *
 * @param {string} str - The str.
 *
 * @returns {Uint8Array<ArrayBufferLike>} The result of stringToBytes.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Bytes to string.
 *
 * @param {Uint8Array<ArrayBufferLike>} bytes - The bytes.
 *
 * @returns {string} The result of bytesToString.
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
