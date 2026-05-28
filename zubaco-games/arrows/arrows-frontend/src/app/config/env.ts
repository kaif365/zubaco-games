/**
 * Typed environment configuration for Arrows game.
 * Mirrors Block Fill's appEnv pattern.
 */
export const appEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  userServiceBaseUrl: import.meta.env.VITE_USER_SERVICE_BASE_URL ?? '',
  gameServiceBaseUrl: import.meta.env.VITE_GAME_SERVICE_BASE_URL ?? '',
  userStageId: import.meta.env.VITE_USER_STAGE_ID ?? '',
  userStageNumber: Number(import.meta.env.VITE_USER_STAGE_NUMBER ?? 1),
  payloadEncryptionEnabled: import.meta.env.VITE_GAME_PAYLOAD_ENCRYPTION_ENABLED === 'true',
  payloadEncryptionKey: import.meta.env.VITE_GAME_PAYLOAD_ENCRYPTION_KEY ?? '',
  clientSecurity: import.meta.env.VITE_CLIENT_SECURITY === 'true',
  cloudfrontUrl: import.meta.env.VITE_CLOUDFRONT_URL ?? '',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '',
} as const;

export type AppEnv = typeof appEnv;
