/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MOCK_USER_SESSION_URL: string;
  readonly VITE_ADMIN_API_BASE_URL: string;
  readonly VITE_STAGE_CONTENT_GAME_TYPE: string;
  readonly VITE_STAGE_ID: string;
  readonly VITE_STAGE_NUMBER: string;
  readonly VITE_ENCRYPTION_ENABLED: string;
  readonly VITE_ENCRYPTION_KEY: string;
  readonly VITE_CLOUDFRONT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
