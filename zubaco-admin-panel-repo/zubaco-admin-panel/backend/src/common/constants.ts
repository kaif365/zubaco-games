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
    ADMIN: 'admin',
    SESSION: 'session',
} as const;

/**
 * Token expiry durations (in seconds)
 */
export const TOKEN_EXPIRY = {
    LOGIN: 7 * 24 * 60 * 60,
} as const;

/**
 * Token type constants
 */
export const TOKEN_TYPES = {
    LOGIN: 1,
} as const;

/**
 * User type constants (numeric)
 */
export const USER_TYPES = {
    ADMIN: 2,
} as const;

export type StatusCodeType = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export const SORT_ORDER = {
    ASC: 'asc',
    DESC: 'desc',
} as const;

export type SortOrderType = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export const GAME_IDS = {
    ARROWS: 1,
    SEQUENCE_RECALL: 2,
    INFINITY_LOOP: 3,
    BLOCK_FILL: 4,
    SLIDING_PUZZLE: 5,
    MEMORY_CARD_MATCHING: 6,
    SUDOKU: 7,
    MAZE_NAVIGATION: 8,
    SPOT_THE_DIFFERENCE: 9,
    LOGIC_REFLECTOR: 10,
} as const;

export const GAME_NAMES: Record<number, string> = {
    [GAME_IDS.ARROWS]: 'Arrows',
    [GAME_IDS.SEQUENCE_RECALL]: 'Sequence Recall',
    [GAME_IDS.INFINITY_LOOP]: 'Infinity Loop',
    [GAME_IDS.BLOCK_FILL]: 'Block Fill',
    [GAME_IDS.SLIDING_PUZZLE]: 'Sliding Puzzle',
    [GAME_IDS.MEMORY_CARD_MATCHING]: 'Memory Card Matching',
    [GAME_IDS.SUDOKU]: 'Sudoku',
    [GAME_IDS.MAZE_NAVIGATION]: 'Maze Navigation',
    [GAME_IDS.SPOT_THE_DIFFERENCE]: 'Spot the Difference',
    [GAME_IDS.LOGIC_REFLECTOR]: 'Logic Reflector',
};
