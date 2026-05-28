/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_USER_SERVICE_BASE_URL: string;
  readonly VITE_GAME_SERVICE_BASE_URL: string;
  readonly VITE_USER_STAGE_ID: string;
  /** When `true`, game API JSON bodies are encrypted with AES-GCM and encrypted responses are decrypted. */
  readonly VITE_GAME_PAYLOAD_ENCRYPTION_ENABLED?: string;
  /** 64-character hex string (32 bytes) for AES-256-GCM; required when encryption is enabled. */
  readonly VITE_GAME_PAYLOAD_ENCRYPTION_KEY?: string;
  /** When `true` in development, enables client hardening (devtools shortcuts, copy, etc.). Always on in production builds. */
  readonly VITE_CLIENT_SECURITY?: string;
  readonly VITE_ADMIN_API_BASE_URL?: string;
  readonly VITE_CLOUDFRONT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
