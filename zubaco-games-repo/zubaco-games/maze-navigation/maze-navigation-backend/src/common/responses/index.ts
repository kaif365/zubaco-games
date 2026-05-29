/**
 * Minimal i18n response message system.
 */

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    // Generic
    OK: "Success",
    CREATED: "Created successfully",
    INTERNAL_SERVER_ERROR: "An internal server error occurred",
    VALIDATION_FAILED: "Validation failed",
    INVALID_TOKEN: "Invalid authentication token",

    // Auth
    TOKEN_MISSING: "Authentication token is required",
    TOKEN_INVALID: "Invalid or missing token",
    TOKEN_EXPIRED: "Token has expired",
    INVALID_SESSION: "Session is invalid or expired",
    FORBIDDEN: "Access denied",
    USER_NOT_FOUND: "User not found",
    USER_VERIFICATION_FAILED: "User verification failed",
    UNAUTHORIZED: "Unauthorized",

    // Game
    INVALID_STAGE: "Invalid game stage",
    STAGE_ALREADY_COMPLETED: "This stage has already been completed",
    NO_ACTIVE_GAME_SESSION: "No active game session found",
    GAME_ALREADY_ACTIVE: "A game is already active for this session",
    NO_ACTIVE_GAME: "No active game found",
    GAME_SESSION_NOT_FOUND: "Game session not found",
    GAME_SESSION_NOT_ACTIVE: "Game session is not active",
    GAME_SESSION_RECOVERY_REQUIRED:
      "Game session is active but recovery state is unavailable",
    NO_ACTIVE_BOARD: "No active maze found",
    NEXT_BOARD_NOT_UNLOCKED: "Next maze is not yet unlocked",
    END_OF_SEQUENCE: "No more mazes in this sequence",
    SUBMISSION_WINDOW_CLOSED: "Submission window for this round has closed",
    OUT_OF_SEQUENCE: "Moves submitted out of sequence",
    MOVE_TIMESTAMP_IN_FUTURE: "Future move timestamp sent",
    ROUND_NUMBER_EXCEEDS_TOTAL_ROUNDS:
      "Round number exceeds total rounds configured",

    // Admin auth
    ADMIN_NOT_FOUND: "Admin not found",
    ADMIN_SESSION_EXPIRED: "Admin session is invalid or expired",
    ADMIN_VERIFICATION_FAILED: "Admin verification failed",

    // Level
    LEVEL_NAME_TAKEN: "A level with this name already exists",
    LEVEL_NOT_FOUND: "Level not found",
    SOME_LEVELS_NOT_FOUND: "One or more levels were not found",

    // Maze config
    MAZE_CONFIG_NOT_FOUND: "Maze difficulty config not found",
    MAZE_CONFIG_ALREADY_EXISTS:
      "A maze difficulty config for this level already exists",

    // Stage config
    STAGE_CONFIG_ALREADY_EXISTS: "A stage config for this stage already exists",
    STAGE_CONFIG_NOT_FOUND: "Stage config not found",
    SOME_STAGE_CONFIGS_NOT_FOUND: "One or more stage configs were not found",
    STAGE_CONFIG_HAS_NO_LEVELS: "Stage configuration has no levels defined",
    LEVEL_NOT_FOUND_FOR_MAZE_CONFIG: "The specified level does not exist",
    INSUFFICIENT_MAZES_FOR_LEVEL:
      "One or more levels do not have maze configs configured",
    LEVEL_IN_USE_BY_STAGE_CONFIG:
      "One or more levels are referenced by an active stage config",
    NO_MAZES_AVAILABLE_FOR_LEVEL: "No maze config available for this level",
  },
};

/**
 * Get message.
 *
 * @param {string} key - key value.
 * @param {string} lang - lang value.
 *
 * @returns {string} The string result.
 */
export function getMessage(key: string, lang = "en"): string {
  const languageMessages = MESSAGES[lang] || MESSAGES["en"];
  return languageMessages[key] ?? key;
}

/**
 * Validate messages.
 */
export function validateMessages(): void {
  // placeholder — add integrity checks here as the message set grows
}
