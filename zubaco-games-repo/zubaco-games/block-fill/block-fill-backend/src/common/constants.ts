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
    ACTIVE: 1,
    COMPLETED: 2,
    DISCONNECTED: 3,
    RESULT_PROCESSING: 4,
    EXPIRED: 5,
    MANUALLY_ENDED: 6,
} as const;

export const GAME_TYPES = {
    BLOCK_FILL: 'BLOCK_FILL',
} as const;

export const GAME_CONFIGS = {
    SQS_POLL_ERROR_RETRY_MS: 5_000,
} as const;

export const ANTI_CHEAT_CONFIGS = {
    CLICK_TOO_FAST_MS: 50,
    UNIFORM_TIMING_CV_THRESHOLD: 0.1,
    UNIFORM_TIMING_MIN_INTERVALS: 3,
    IMPOSSIBLE_SOLVE_MS_PER_ARROW: 100,
} as const;

export const CHEAT_FLAG_TYPE = {
    CLICK_TOO_FAST: 1,
    UNIFORM_TIMING: 2,
    REMAINING_MOVES_AT_END: 3,
    IMPOSSIBLE_SOLVE_TIME: 4,
} as const;

export const RESTATE_SERVICES = {
    GAME_EXPIRY: 'BlockFillGameExpiryRestateService',
    GAME_SESSION: 'BlockFillGameSessionRestateObject',
} as const;

/** Maximum value for a PostgreSQL INTEGER (INT4) column. */
export const INT4_MAX = 2147483647;

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];
export type GameSessionStatus = (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
export type GameType = (typeof GAME_TYPES)[keyof typeof GAME_TYPES];
export type CheatFlagType = (typeof CHEAT_FLAG_TYPE)[keyof typeof CHEAT_FLAG_TYPE];
