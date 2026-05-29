/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set (non-empty), overrides API `stageNumber` for theme and micro-screens (dev / standalone). */
  readonly VITE_STAGE_NUMBER?: string;
  readonly VITE_CLOUDFRONT_URL: string;
}
