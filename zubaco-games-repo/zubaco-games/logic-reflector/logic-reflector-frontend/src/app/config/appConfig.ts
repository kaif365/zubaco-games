function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export const appConfig = {
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'ZUBACO Games',
  version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0',
  env: (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development',

  api: {
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
    timeout: Number((import.meta.env.VITE_API_TIMEOUT as string | undefined) ?? '10000'),
  },

  game: {
    apiUrl: normalizeUrl((import.meta.env.VITE_GAME_API_URL as string | undefined) ?? ''),
    usersApiUrl: normalizeUrl((import.meta.env.VITE_USERS_API_URL as string | undefined) ?? ''),
    stageId: (import.meta.env.VITE_STAGE_ID as string | undefined) ?? 'logic-reflector',
    stageNo: Number((import.meta.env.VITE_STAGE_NO as string | undefined) ?? '1'),
  },

  mock: {
    enabled: (import.meta.env.VITE_MOCK_API as string | undefined) === 'true',
  },

  features: {
    devtools: (import.meta.env.VITE_FEATURE_DEVTOOLS as string | undefined) === 'true',
    analytics: (import.meta.env.VITE_FEATURE_ANALYTICS as string | undefined) === 'true',
  },

  analytics: {
    id: (import.meta.env.VITE_ANALYTICS_ID as string | undefined) ?? '',
  },

  encryption: {
    key: (import.meta.env.VITE_ENCRYPTION_KEY as string | undefined) ?? '',
    enabled: (import.meta.env.VITE_ENCRYPTION_ENABLED as string | undefined) === 'true',
  },
} as const;

export type AppConfig = typeof appConfig;

// Only throw at runtime if non-mock and required vars are missing
export function validateConfig(): void {
  if (appConfig.mock.enabled) return;
  requireEnv('VITE_GAME_API_URL');
  requireEnv('VITE_USERS_API_URL');
  requireEnv('VITE_STAGE_ID');
}
