import type { StageId } from "@/types/stage-theme";

function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: keyof ImportMetaEnv): string {
  return import.meta.env[key]?.trim() ?? "";
}

function toStageNumber(value: string | undefined): StageId {
  const n = Number(value);
  if (n >= 1 && n <= 4) {
    return Math.floor(n) as StageId;
  }
  return 1;
}

export const appConfig = {
  api: {
    baseUrl: requireEnv("VITE_API_BASE_URL"),
    mockUserSessionUrl: optionalEnv("VITE_MOCK_USER_SESSION_URL"),
    adminBaseUrl: optionalEnv("VITE_ADMIN_API_BASE_URL"),
  },
  stage: {
    id: requireEnv("VITE_STAGE_ID"),
    number: toStageNumber(import.meta.env.VITE_STAGE_NUMBER),
    contentGameType:
      optionalEnv("VITE_STAGE_CONTENT_GAME_TYPE") || "MAZE_NAVIGATION",
  },
  encryption: {
    enabled: import.meta.env.VITE_ENCRYPTION_ENABLED === "true",
    key: optionalEnv("VITE_ENCRYPTION_KEY"),
  },
} as const;

export type AppConfig = typeof appConfig;
