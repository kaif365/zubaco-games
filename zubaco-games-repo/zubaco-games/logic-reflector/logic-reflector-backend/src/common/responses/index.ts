/**
 * Minimal i18n response message system.
 * All user-facing messages keyed by constant string identifiers.
 */

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    // Generic
    OK: "Success",
    CREATED: "Created successfully",
    INTERNAL_SERVER_ERROR: "An internal server error occurred",
    VALIDATION_FAILED: "Validation failed",
    INVALID_TOKEN: "Invalid authentication token",
    WS_ERROR: "WebSocket error occurred",
    HTTP_ERROR: "HTTP communication error",
    INVALID_ENCRYPTED_PAYLOAD: "Encrypted payload is invalid",
    REQUEST_MUST_BE_ENCRYPTED: "This request must be encrypted",
    ENCRYPTION_FAILED: "Encryption failed",
    ENCRYPTION_KEY_MISSING: "Encryption key is missing",
    INVALID_EXCLUDE_BOARD_IDS: "One or more excluded board ids are invalid",
    INVALID_INTEGER_RANGE:
      "One or more numeric values are outside the supported range",

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
    NO_ACTIVE_BOARD: "No active board found",
    NEXT_BOARD_NOT_UNLOCKED: "Next board is not yet unlocked",
    END_OF_SEQUENCE: "No more boards in this sequence",
    SUBMISSION_WINDOW_CLOSED: "Submission window for this round has closed",
    OUT_OF_SEQUENCE: "Moves submitted out of sequence",
    MOVE_TIMESTAMP_IN_FUTURE: "Future move timestamp sent",
    SESSION_BOARD_NOT_FOUND: "Session board not found",
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
    LEVEL_NOT_FOUND_FOR_BOARD: "The specified level does not exist",

    // Board
    BOARD_NAME_TAKEN: "A board with this name already exists in this level",
    BOARD_NOT_FOUND: "Board not found",
    SOME_BOARDS_NOT_FOUND: "One or more boards were not found",
    PUZZLE_GENERATION_FAILED: "Failed to generate board puzzle",
    NO_BOARDS_AVAILABLE_FOR_LEVEL: "No available boards for this level",

    // Stage config
    STAGE_CONFIG_ALREADY_EXISTS: "A stage config for this stage already exists",
    STAGE_CONFIG_NOT_FOUND: "Stage config not found",
    SOME_STAGE_CONFIGS_NOT_FOUND: "One or more stage configs were not found",
    INSUFFICIENT_BOARDS_FOR_LEVEL:
      "One or more levels do not have enough active boards for the requested board count",
    LEVEL_IN_USE_BY_STAGE_CONFIG:
      "One or more levels are referenced by an active stage config and cannot be deleted",
    BOARD_DELETE_VIOLATES_STAGE_CONFIG:
      "Deleting these boards would violate the board count required by an active stage config",
    STAGE_CONFIG_HAS_NO_LEVELS: "Stage configuration has no levels defined",
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
