import { slugifyGameName } from "@/utils/slugify";

export const QUERY_KEYS = {
  DASHBOARD: {
    STATS: ["dashboard", "stats"] as const,
    ACTIVITY: ["dashboard", "activity"] as const,
  },
  GAMES: {
    ALL: ["games"] as const,
    LIST: (params: Record<string, unknown>) =>
      ["games", "list", params] as const,
    ADMIN_LIST: ["games", "admin", "list"] as const,
    DETAIL: (id: string, params?: { language?: string; stage_id?: string }) =>
      ["games", "detail", id, params?.language ?? "default", params?.stage_id ?? "none"] as const,
  },
  STAGE_GAME_CONFIGS: {
    DETAIL: (stageId: string, gameName?: string) =>
      [
        "stage-configs",
        "detail",
        stageId,
        gameName ? slugifyGameName(gameName) : "generic",
      ] as const,
  },
  USERS: {
    ALL: ["users"] as const,
    LIST: (params: Record<string, unknown>) =>
      ["users", "list", params] as const,
    DETAIL: (id: string) => ["users", "detail", id] as const,
  },
  FLAGGED: {
    ALL: ["flagged"] as const,
    LIST: (params: Record<string, unknown>) =>
      ["flagged", "list", params] as const,
    DETAIL: (id: string) => ["flagged", "detail", id] as const,
  },
  AUTH: {
    USER: ["auth", "user"] as const,
  },
  STAGES: {
    ALL: ["stages"] as const,
    LIST: (params: Record<string, unknown>) =>
      ["stages", "list", params] as const,

    DETAIL: (id: string) => ["stages", "detail", id] as const,
    ASSIGNED_GAME_IDS: (id: string) =>
      ["stages", "assigned-game-ids", id] as const,
  },
  TOURNAMENTS: {
    ALL: ["tournaments"] as const,
    LIST: (params: Record<string, unknown>) =>
      ["tournaments", "list", params] as const,
    DETAIL: (id: string) => ["tournaments", "detail", id] as const,
    ASSIGNED_STAGE_IDS: (id: string) =>
      ["tournaments", "assigned-stage-ids", id] as const,
  },
} as const;
