/**
 * Returns a trimmed env string, or an empty string when unset.
 *
 * @param {string | undefined} value - Raw `import.meta.env` value.
 *
 * @returns {string} Trimmed string or empty string.
 */
function getTrimmedEnv(value: string | undefined) {
  return value?.trim() ?? '';
}

/**
 * Parses common truthy string representations from the environment.
 *
 * @param {string | undefined} value - Raw env value.
 * @param {boolean} [defaultValue=false] - Default when value is empty or undefined.
 *
 * @returns {boolean} Parsed boolean.
 */
function parseEnvBool(value: string | undefined, defaultValue = false) {
  if (value === undefined || value === '') return defaultValue;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export const appEnv = {
  apiBaseUrl: getTrimmedEnv(import.meta.env.VITE_API_BASE_URL),
  userServiceBaseUrl: getTrimmedEnv(import.meta.env.VITE_USER_SERVICE_BASE_URL),
  gameServiceBaseUrl: getTrimmedEnv(import.meta.env.VITE_GAME_SERVICE_BASE_URL),
  userStageId: getTrimmedEnv(import.meta.env.VITE_USER_STAGE_ID),
  userStageNumber: getTrimmedEnv(import.meta.env.VITE_USER_STAGE_NUMBER),
  gamePayloadEncryptionEnabled: parseEnvBool(import.meta.env.VITE_GAME_PAYLOAD_ENCRYPTION_ENABLED),
  gamePayloadEncryptionKey: getTrimmedEnv(import.meta.env.VITE_GAME_PAYLOAD_ENCRYPTION_KEY),
  /** Blocks common devtools shortcuts, context menu, copy/drag on images, etc. On in production; in dev set `VITE_CLIENT_SECURITY=true` to test. */
  clientSecurityEnabled: import.meta.env.PROD || parseEnvBool(import.meta.env.VITE_CLIENT_SECURITY),
  cloudfrontUrl: getTrimmedEnv(import.meta.env.VITE_CLOUDFRONT_URL),
};

/**
 * Returns the symmetric AES key for game payload crypto when enabled, after validating format.
 * When encryption is disabled, returns undefined; when enabled, throws if the key is missing or invalid.
 *
 * @returns {string | undefined} 64-character hex key, or undefined when encryption is off.
 */
export function getGamePayloadSymmetricKey(): string | undefined {
  if (!appEnv.gamePayloadEncryptionEnabled) return undefined;

  const key = appEnv.gamePayloadEncryptionKey;
  if (!key) {
    throw new Error(
      'VITE_GAME_PAYLOAD_ENCRYPTION_ENABLED is true but VITE_GAME_PAYLOAD_ENCRYPTION_KEY is missing. Set it to a 64-character hex string (32-byte AES key).',
    );
  }
  if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('VITE_GAME_PAYLOAD_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.');
  }
  return key;
}
