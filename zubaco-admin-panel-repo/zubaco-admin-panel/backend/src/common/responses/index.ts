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
    ADMIN_NOT_FOUND: 'Admin not found',
    STAGE_NOT_FOUND: 'Stage not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    LOGGED_OUT: 'Logged out successfully',

    // Game & Stage
    GAME_NOT_FOUND: 'Game not found',
    GAME_ALREADY_EXISTS: 'A game with this identifier already exists',
    STAGE_ALREADY_EXISTS: 'This stage is already configured',
    GAME_STAGE_ALREADY_EXISTS: 'This stage already exists for the specified game',

    // Tournament
    TOURNAMENT_NOT_FOUND: 'Tournament not found',
    TOURNAMENT_ALREADY_EXISTS: 'A tournament with this identifier already exists',
    TOURNAMENT_STAGE_ALREADY_EXISTS: 'This stage already exists for the specified tournament',
};

/**
 * Returns the message for a given key, falling back to the key itself
 * if no translation is found. Language support can be extended later.
 */
export function getMessage(key: string, _lang = 'en'): string {
    void _lang; // reserved for future i18n support
    return MESSAGES[key] ?? key;
}

/** Called on startup — no-op for now, validates message map integrity in future */
export function validateMessages(): void {
    // placeholder — add integrity checks here as the message set grows
}
