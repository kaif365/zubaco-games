/**
 * Minimal i18n response message system.
 * All user-facing messages keyed by constant string identifiers.
 */

const MESSAGES: Record<string, string> = {
    // Generic
    OK: 'Success',
    CREATED: 'Created successfully',
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',
    VALIDATION_FAILED: 'Validation failed',

    // Auth
    TOKEN_INVALID: 'Invalid or missing token',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_SESSION: 'Session is invalid or expired',
    FORBIDDEN: 'Access denied',
    USER_NOT_FOUND: 'User not found',

    // Game
    INVALID_STAGE: 'Invalid game stage',
    STAGE_ALREADY_COMPLETED: 'This stage has already been completed',
    NO_ACTIVE_GAME_SESSION: 'No active game session found',

    // Admin auth
    ADMIN_NOT_FOUND: 'Admin not found',
    ADMIN_SESSION_EXPIRED: 'Admin session is invalid or expired',
    ADMIN_VERIFICATION_FAILED: 'Admin verification failed',

    // Level
    LEVEL_NAME_TAKEN: 'A level with this name already exists',
    LEVEL_NOT_FOUND: 'Level not found',
    SOME_LEVELS_NOT_FOUND: 'One or more levels were not found',
    LEVEL_NOT_FOUND_FOR_BOARD: 'The specified level does not exist',

    // Board
    BOARD_NAME_TAKEN: 'A board with this name already exists in this level',
    BOARD_NOT_FOUND: 'Board not found',
    SOME_BOARDS_NOT_FOUND: 'One or more boards were not found',

    // Stage config
    STAGE_CONFIG_ALREADY_EXISTS: 'A stage config for this stage already exists',
    STAGE_CONFIG_NOT_FOUND: 'Stage config not found',
    SOME_STAGE_CONFIGS_NOT_FOUND: 'One or more stage configs were not found',
    STAGE_ID_REQUIRED: 'Stage ID is required when multiple stage configs exist',
    INSUFFICIENT_BOARDS_FOR_LEVEL:
        'One or more levels do not have enough active boards for the requested board count',
    DEMO_LEVELS_REQUIRED_FOR_DEMO_ROUNDS: 'Demo rounds require dedicated demo levels for the stage',
    INSUFFICIENT_UNPLAYED_DEMO_BOARDS_FOR_STAGE:
        'No unplayed demo boards remain for this user in the selected stage',
    TOTAL_ROUNDS_MISMATCH: 'Total rounds must match the sum of configured level board counts',
    LEVEL_IN_USE_BY_STAGE_CONFIG:
        'One or more levels are referenced by an active stage config and cannot be deleted',
    BOARD_DELETE_VIOLATES_STAGE_CONFIG:
        'Deleting these boards would violate the board count required by an active stage config',
};

/**
 * Returns the message for a given key, falling back to the key itself
 * if no translation is found. Language support can be extended later.
 */
export function getMessage(key: string, lang = 'en'): string {
    void lang;
    return MESSAGES[key] ?? key;
}

/** Called on startup — no-op for now, validates message map integrity in future */
export function validateMessages(): void {
    // placeholder — add integrity checks here as the message set grows
}
