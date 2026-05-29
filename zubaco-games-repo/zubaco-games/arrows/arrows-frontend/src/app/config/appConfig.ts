export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? "ZUBACO Games",
  version: import.meta.env.VITE_APP_VERSION ?? "1.0.0",
  env: import.meta.env.VITE_APP_ENV ?? "development",

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
    timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 10000),
  },

  features: {
    devtools: import.meta.env.VITE_FEATURE_DEVTOOLS === "true",
    analytics: import.meta.env.VITE_FEATURE_ANALYTICS === "true",
    encryption: import.meta.env.VITE_ENABLE_ENCRYPTION !== "false",
  },

  analytics: {
    id: import.meta.env.VITE_ANALYTICS_ID ?? "",
  },
  cloudfrontUrl: import.meta.env.VITE_CLOUDFRONT_URL ?? "",
} as const;

export type AppConfig = typeof appConfig;
