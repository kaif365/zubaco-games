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

/**
 * Token expiry durations (in seconds)
 */
export const TOKEN_EXPIRY = {
    LOGIN: 7 * 24 * 60 * 60, // 7 days — long-lived login token
    GAME_SESSION: 10 * 60, // 10 minutes — socket game session token
} as const;

/**
 * Token type constants
 */
export const TOKEN_TYPES = {
    LOGIN: 1,
    GAME_SESSION: 2,
} as const;

/**
 * User type constants (numeric)
 */
export const USER_TYPES = {
    USER: 1,
    ADMIN: 2,
} as const;

export const AUTH_TYPES = {
    USER: 1,
    ADMIN: 2,
    USER_OR_ADMIN: 3,
} as const;

/**
 * Game session status constants
 */
export const GAME_SESSION_STATUS = {
    ACTIVE: 1,
    COMPLETED: 2,
    DISCONNECTED: 3,
    RESULT_PROCESSING: 4,
    EXPIRED: 5,
    MANUALLY_ENDED: 6,
} as const;

export const TERMINAL_GAME_SESSION_STATUSES = [
    GAME_SESSION_STATUS.COMPLETED,
    GAME_SESSION_STATUS.EXPIRED,
    GAME_SESSION_STATUS.MANUALLY_ENDED,
] as const;

export const CHEAT_REASONS = {
    CLICK_TOO_FAST: 1,
    UNIFORM_TIMING: 2,
    IMPOSSIBLE_SOLVE_TIME: 3,
    INVALID_END_STATE: 4,
} as const;

export const GAME_CONFIGS = {
    EXPIRY_GRACE_SECONDS: 120,
    CLICK_TOO_FAST_MS: 10,
    TIME_BONUS_PER_SECOND: 1,
    UNIFORM_TIMING_MIN_INTERVALS: 5,
    UNIFORM_TIMING_CV_THRESHOLD: 0.15,
    IMPOSSIBLE_SOLVE_PER_STEP_MS: 30,
    MOVE_TIMESTAMP_FUTURE_SKEW_MS: 5000,
} as const;

export const RESTATE_SERVICES = {
    GAME_SESSION: 'SequenceRecallGameSessionRestateObject',
    GAME_EXPIRY: 'SequenceRecallGameExpiryRestateService',
} as const;

export const WRONG_MOVE_HANDLING = {
    GAME_END: 1, // FE calls game-over immediately
    PLAY_AGAIN: 2, // FE replays the current sequence
    PREV_SEQUENCE: 3, // FE calls prev-sequence
    NEXT_SEQUENCE: 4, // FE calls next-sequence (default)
} as const;

export type WrongMoveHandling = (typeof WRONG_MOVE_HANDLING)[keyof typeof WRONG_MOVE_HANDLING];

export const MOVE_STATUS = {
    SUCCESS: 'SUCCESS',
    WRONG_MOVE: 'WRONG_MOVE',
    ROUND_SUCCESS: 'ROUND_SUCCESS',
    GAME_COMPLETE: 'GAME_COMPLETE',
    TIME_UP: 'TIME_UP',
} as const;

export const GAME_DEFAULTS = {
    TIME_LIMIT: 180,
    MAX_ROUNDS: 5,
    INITIAL_SEQUENCE_LENGTH: 1,
    BONUS_TIME_RATIO: 1.0,
    CELL_COUNT: 4,
    SCORE_PER_ROUND: 20,
    DEMO_ROUNDS: 3,
} as const;

/**
 * Valid game stages (1–5)
 */
export const GAME_STAGES = {
    MIN: 1,
    MAX: 5,
} as const;

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];
export type GameSessionStatus = (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
export type TerminalGameSessionStatus = (typeof TERMINAL_GAME_SESSION_STATUSES)[number];
