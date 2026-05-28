/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: "development" | "staging" | "production";
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_DEV_SESSION_URL: string;
  readonly VITE_ENCRYPTION_KEY: string;
  readonly VITE_ENABLE_ENCRYPTION: string;
  readonly VITE_FEATURE_DEVTOOLS: string;
  readonly VITE_FEATURE_ANALYTICS: string;
  readonly VITE_ANALYTICS_ID: string;
  readonly VITE_DEV_LEVEL: string;
  readonly VITE_STAGE_NUMBER: string;
  readonly VITE_CLOUDFRONT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
