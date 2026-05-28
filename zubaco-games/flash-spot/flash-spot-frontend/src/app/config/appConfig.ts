function toStageNumber(value: string | undefined): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const n = Number(value);
  if (n >= 1 && n <= 7) return n as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return 1;
}

function requireEnv(key: string): string {
  const value = (import.meta.env as Record<string, string>)[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME,
  version: import.meta.env.VITE_APP_VERSION,
  env: import.meta.env.VITE_APP_ENV,

  api: {
    baseUrl: requireEnv('VITE_API_BASE_URL'),
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  },

  features: {
    devtools: import.meta.env.VITE_FEATURE_DEVTOOLS === 'true',
    analytics: import.meta.env.VITE_FEATURE_ANALYTICS === 'true',
  },

  encryption: {
    enabled: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true',
    key: import.meta.env.VITE_PAYLOAD_AES_SECRET,
  },

  embed: {
    parentOrigin: import.meta.env.VITE_PARENT_ORIGIN,
  },

  socket: {
    stageId: requireEnv('VITE_STAGE_ID'),
    stageNumber: toStageNumber(import.meta.env.VITE_STAGE_NUMBER),
  },
} as const;

export type AppConfig = typeof appConfig;
