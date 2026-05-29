export const namespaces = "api";
export const VERSION = "v1";
export const USER_BASE = "user";
export const ADMIN_BASE = "admin";

/** Paths relative to `VITE_API_BASE_URL` (must include `/v1` segment, e.g. `https://host/api/v1`). */
export const GAME_BASE = "game";

const URL = {
  USER_AUTH_DEV_SESSION: `${USER_BASE}/auth/dev-session`,
  USER_DEMO: `${VERSION}/${USER_BASE}/demo`,
  ADMIN_GAMES_STAGE_CONTENT: `${ADMIN_BASE}/games/stage-content`,
  GAME_START: `${VERSION}/${GAME_BASE}/game-start`,
  GAME_STATUS: `${VERSION}/${GAME_BASE}/status`,
  GAME_SUBMIT_MOVES: `${VERSION}/${GAME_BASE}/submit-moves`,
  GAME_NEXT_BOARD: `${VERSION}/${GAME_BASE}/next-board`,
  GAME_END_BOARD: `${VERSION}/${GAME_BASE}/end-board`,
  GAME_END_GAME: `${VERSION}/${GAME_BASE}/end-game`,
} as const;

export default URL;
