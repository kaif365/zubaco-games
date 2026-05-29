/**
 * Application Constants
 */

export const INT32_MIN = -2_147_483_648;
export const INT32_MAX = 2_147_483_647;

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];

export const HEADERS = {
  ACCEPT_LANGUAGE: "accept-language",
  AUTHORIZATION: "authorization",
} as const;

export const REQUEST_CONTEXT = {
  LANGUAGE: "language",
  USER: "user",
} as const;

export const TOKEN_EXPIRY = {
  LOGIN: 7 * 24 * 60 * 60, // 7 days
  GAME_SESSION: 10 * 60, // 10 minutes
} as const;

export const TOKEN_TYPES = {
  LOGIN: 1,
  GAME_SESSION: 2,
} as const;

export const USER_TYPES = {
  USER: 1,
  ADMIN: 2,
} as const;

export const AUTH_TYPES = {
  USER: 1,
  ADMIN: 2,
  USER_OR_ADMIN: 3,
} as const;

export const GAME_SESSION_STATUS = {
  STARTED: 1,
  ENDED: 2,
  EXPIRED: 3,
  RESULT_PROCESSING: 4,
  MANUALLY_ENDED: 5,
} as const;

export const GAME_CONFIGS = {
  NEXT_MAZE_REACHED_END_THRESHOLD: true, // unlock next maze when reached end
  SUBMIT_MOVES_EXPIRY_GRACE_SECONDS: 120,
  MOVE_TIMESTAMP_FUTURE_SKEW_MS: 5_000,
  TIME_BONUS_PER_SECOND: 10,
  NEAR_END_PREFETCH_DISTANCE: 5, // Manhattan distance threshold to pre-generate next maze
} as const;

export const TRANSACTION_CONFIGS = {
  MAX_WAIT_MS: 5_000,
  TIMEOUT_MS: 15_000,
} as const;

export const ANTI_CHEAT_CONFIGS = {
  MOVE_TOO_FAST_MS: 50,
  UNIFORM_TIMING_CV_THRESHOLD: 0.1,
  UNIFORM_TIMING_MIN_INTERVALS: 3,
  IMPOSSIBLE_SOLVE_MS_PER_MOVE: 100,
} as const;

export const MOVE_DIRECTION = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
} as const;

export const CHEAT_FLAG_TYPE = {
  MOVE_TOO_FAST: 1,
  UNIFORM_TIMING: 2,
  IMPOSSIBLE_PATH: 3,
  IMPOSSIBLE_SOLVE_TIME: 4,
} as const;

export const CRYPTO_CONFIGS = {
  ALGORITHM: "aes-256-gcm",
  IV_LENGTH_BYTES: 12,
  KEY_LENGTH_BYTES: 32,
} as const;

export const DEFAULT_STAGE_CONFIG = {
  TIME_LIMIT_SECONDS: 600, // 10 minutes
  BOARD_COUNT: 1, // one board per level
  MAZE_ROWS: 15,
  MAZE_COLS: 15,
} as const;

export const RESTATE_SERVICES = {
  GAME_EXPIRY: "MazeGameExpiryRestateService",
  GAME_SESSION: "MazeGameSessionRestateObject",
} as const;

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];
export type GameSessionStatus =
  (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
export type GameConfig = typeof GAME_CONFIGS;
export type CheatFlagType =
  (typeof CHEAT_FLAG_TYPE)[keyof typeof CHEAT_FLAG_TYPE];
export type MoveDirection =
  (typeof MOVE_DIRECTION)[keyof typeof MOVE_DIRECTION];
