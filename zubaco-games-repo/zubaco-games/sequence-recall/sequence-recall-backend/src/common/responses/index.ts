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
    STAGE_CONFIG_NOT_FOUND: 'No configuration found for this stage',
    NO_ACTIVE_GAME_SESSION: 'No active game session found',
    GAME_SESSION_NOT_FOUND: 'Game session not found',
    GAME_SESSION_NOT_ACTIVE: 'Game session is not active',
    GAME_SESSION_RECOVERY_REQUIRED:
        'A previous session exists but cannot be recovered. Please contact support.',
    MOVE_TIMESTAMP_IN_FUTURE: 'Move was rejected: server clock skew detected. Please try again.',
    OUT_OF_SEQUENCE: 'Move rejected: out-of-sequence request detected',
    NO_MORE_ACTUAL_ROUNDS: 'No more rounds available',
};

/**
 * Gets message.
 *
 * @param {string} key - The key.
 * @param {string} lang - The lang.
 *
 * @returns {string} The result of getMessage.
 */
export function getMessage(key: string, lang = 'en'): string {
    void lang;
    return MESSAGES[key] ?? key;
}

/**
 * Validates messages.
 *
 * @returns {void} No return value.
 */
export function validateMessages(): void {
    // placeholder — add integrity checks here as the message set grows
}
