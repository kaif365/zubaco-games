export const namespaces = "api";

/** API path version segment (e.g. `v1/user/...`). */
export const VERSION = "v1";

export const USER_BASE = "user";
export const ADMIN_BASE = "admin";

const GAME_BASE = "game";
const LEVELS_BASE = "levels";

const URL = {
  GAME_LEVELS: `${GAME_BASE}/${LEVELS_BASE}`,
  GAME_LEVEL_BY_ID: (id: string) => `${GAME_BASE}/${LEVELS_BASE}/${id}`,
  USER_DEMO: `${VERSION}/${USER_BASE}/demo`,
  ADMIN_GAMES_STAGE_CONTENT: `${ADMIN_BASE}/games/stage-content`,
  USER_AUTH_DEV_SESSION: `${USER_BASE}/auth/dev-session`,
} as const;

export default URL;
