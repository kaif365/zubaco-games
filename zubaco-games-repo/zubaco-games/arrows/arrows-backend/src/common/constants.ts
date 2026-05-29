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
    ACCEPT_LANGUAGE: 'accept-language',
    AUTHORIZATION: 'authorization',
} as const;

export const REQUEST_CONTEXT = {
    LANGUAGE: 'language',
    USER: 'user',
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
    MAX_SCORE: 1000,
    MAX_TIME_BONUS: 1000,
} as const;

export const GAME_CONFIGS = {
    NEXT_BOARD_ARROWS_REMAINING_THRESHOLD: 1, // unlock next-board when ≤ N arrows remain
    NEXT_BOARD_SOLVE_PCT_THRESHOLD: 0, // OR when ≥ N% arrows removed
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
    IMPOSSIBLE_SOLVE_MS_PER_ARROW: 100, // board solved faster than N ms × arrow count = flagged
} as const;

/**
 * Arrow head direction integers — matches Unity enum order.
 * 0=up  1=down  2=left  3=right
 */
export const HEAD_DIRECTION = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
} as const;

/**
 * Grid deltas for each head direction.
 * Used by the path-clear check to walk cells from head → wall.
 * dx = column delta, dy = row delta.
 */
export const DIR_DELTA: Record<number, { dx: number; dy: number }> = {
    [HEAD_DIRECTION.UP]: { dx: 0, dy: 1 }, // y increases upward (Unity/math coords)
    [HEAD_DIRECTION.DOWN]: { dx: 0, dy: -1 },
    [HEAD_DIRECTION.LEFT]: { dx: -1, dy: 0 },
    [HEAD_DIRECTION.RIGHT]: { dx: 1, dy: 0 },
};

/**
 * Int → string direction label used in the gameLevels.ts / client format.
 */
export const DIR_TO_STRING: Record<number, string> = {
    [HEAD_DIRECTION.UP]: 'up',
    [HEAD_DIRECTION.DOWN]: 'down',
    [HEAD_DIRECTION.LEFT]: 'left',
    [HEAD_DIRECTION.RIGHT]: 'right',
};

export const STRING_TO_DIR: Record<string, number> = {
    up: HEAD_DIRECTION.UP,
    down: HEAD_DIRECTION.DOWN,
    left: HEAD_DIRECTION.LEFT,
    right: HEAD_DIRECTION.RIGHT,
};

export const GAME_CONFIG_EVENT_TYPE = {
    STAGE_ATTACHED: 'GAME_STAGE_ATTACHED',
    STAGE_DETACHED: 'GAME_STAGE_DETACHED',
} as const;

export const CHEAT_FLAG_TYPE = {
    CLICK_TOO_FAST: 1,
    UNIFORM_TIMING: 2,
    REMAINING_MOVES_AT_END: 3,
    IMPOSSIBLE_SOLVE_TIME: 4,
} as const;

export const CRYPTO_CONFIGS = {
    ALGORITHM: 'aes-256-gcm',
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
    GAME_EXPIRY: 'ArrowsGameExpiryRestateService',
    GAME_SESSION: 'ArrowsGameSessionRestateObject',
} as const;

/** Maximum value for a PostgreSQL INTEGER (INT4) column. */
export const INT4_MAX = 2147483647;

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];
export type GameSessionStatus = (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
export type GameConfig = typeof GAME_CONFIGS;
export type HeadDirection = (typeof HEAD_DIRECTION)[keyof typeof HEAD_DIRECTION];
export type CheatFlagType = (typeof CHEAT_FLAG_TYPE)[keyof typeof CHEAT_FLAG_TYPE];
