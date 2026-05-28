/**
 * Application Constants
 */

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

export const DEFAULT_STAGE_CONFIG = {
  TIME_LIMIT: 60,
  BOARD_COUNT: 1,
  DEMO_BOARD_COUNT: 1,
} as const;

export const GAME_CONFIGS = {
  SUBMIT_MOVES_EXPIRY_GRACE_SECONDS: 120, // accept submissions up to 2 min after expiryAt
  MOVE_TIMESTAMP_FUTURE_SKEW_MS: 5_000, // tolerate small client/server clock skew
  TIME_BONUS_PER_SECOND: 10, // score points per second remaining at last end-board
  SQS_POLL_ERROR_RETRY_MS: 5_000, // wait before retrying after a failed SQS poll
} as const;

export const TRANSACTION_CONFIGS = {
  MAX_WAIT_MS: 5_000,
  TIMEOUT_MS: 15_000,
} as const;

export const ANTI_CHEAT_CONFIGS = {
  CLICK_TOO_FAST_MS: 50, // minimum ms between any two consecutive clicks
  UNIFORM_TIMING_CV_THRESHOLD: 0.1, // CV below this = bot-like uniformity
  UNIFORM_TIMING_MIN_INTERVALS: 3, // minimum intervals needed to compute CV
  IMPOSSIBLE_SOLVE_MS_PER_ARROW: 100, // board solved faster than N ms × move count = flagged
} as const;

export const GAME_CONFIG_EVENT_TYPE = {
  STAGE_ATTACHED: "GAME_STAGE_ATTACHED",
  STAGE_DETACHED: "GAME_STAGE_DETACHED",
} as const;

export const CHEAT_FLAG_TYPE = {
  CLICK_TOO_FAST: 1,
  UNIFORM_TIMING: 2,
  REMAINING_MOVES_AT_END: 3,
  IMPOSSIBLE_SOLVE_TIME: 4,
} as const;

export const CRYPTO_CONFIGS = {
  ALGORITHM: "aes-256-gcm",
  IV_LENGTH_BYTES: 12,
  KEY_LENGTH_BYTES: 32,
} as const;

export const AUTH_CACHE_CONFIGS = {
  /** Maximum number of token entries held in the in-process LRU cache. */
  MAX_ENTRIES: 500,
  /** Hard cap on how long a cache entry can live, regardless of token expiry (ms). */
  MAX_TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

export const RESTATE_SERVICES = {
  GAME_EXPIRY: "LogicReflectorGameExpiryRestateService",
  GAME_SESSION: "LogicReflectorGameSessionRestateObject",
} as const;

// Integer codes stored in DB
export const CELL_TYPE = {
  EMITTER: 1,
  TARGET: 2,
  BLOCKER: 3,
  REFLECT_BLOCK: 4,
  MIRROR_FWD: 5,
  MIRROR_BWD: 6,
  SPLITTER: 7,
} as const;

export const BLOCK_TYPE = {
  REFLECT_BLOCK: 1,
  MIRROR_FWD: 2,
  MIRROR_BWD: 3,
  SPLITTER: 4,
  BLOCKER: 5,
} as const;

// Maps integer → frontend string (for API responses)
export const CELL_TYPE_TO_STRING: Record<number, string> = {
  [CELL_TYPE.EMITTER]: "emitter",
  [CELL_TYPE.TARGET]: "target",
  [CELL_TYPE.BLOCKER]: "blocker",
  [CELL_TYPE.REFLECT_BLOCK]: "reflect-block",
  [CELL_TYPE.MIRROR_FWD]: "mirror-fwd",
  [CELL_TYPE.MIRROR_BWD]: "mirror-bwd",
  [CELL_TYPE.SPLITTER]: "splitter",
};

export const BLOCK_TYPE_TO_STRING: Record<number, string> = {
  [BLOCK_TYPE.REFLECT_BLOCK]: "reflect-block",
  [BLOCK_TYPE.MIRROR_FWD]: "mirror-fwd",
  [BLOCK_TYPE.MIRROR_BWD]: "mirror-bwd",
  [BLOCK_TYPE.SPLITTER]: "splitter",
  [BLOCK_TYPE.BLOCKER]: "blocker",
};

// Maps frontend string → integer (for incoming requests)
export const STRING_TO_BLOCK_TYPE: Record<string, number> = {
  "reflect-block": BLOCK_TYPE.REFLECT_BLOCK,
  "mirror-fwd": BLOCK_TYPE.MIRROR_FWD,
  "mirror-bwd": BLOCK_TYPE.MIRROR_BWD,
  splitter: BLOCK_TYPE.SPLITTER,
  blocker: BLOCK_TYPE.BLOCKER,
};

export const BLOCK_TYPE_STRINGS = Object.keys(STRING_TO_BLOCK_TYPE) as [
  string,
  ...string[],
];

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];
export type GameSessionStatus =
  (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
export type GameConfig = typeof GAME_CONFIGS;
export type CheatFlagType =
  (typeof CHEAT_FLAG_TYPE)[keyof typeof CHEAT_FLAG_TYPE];
