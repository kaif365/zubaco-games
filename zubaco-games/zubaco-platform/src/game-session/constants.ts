/**
 * Shared session bounds used by every game-session submit path
 * (free play, generic game session, tournament) so that duration/score
 * limits stay consistent across engines.
 */
export const MIN_SESSION_DURATION_MS = 1000;
export const MAX_SESSION_DURATION_MS = 600_000; // 10 minutes
export const MAX_SCORE = 100_000;

/**
 * Grace period added to MAX_SESSION_DURATION_MS before an unfinished
 * session is considered stale and reaped to TIMED_OUT.
 */
export const SESSION_STALE_GRACE_MS = 120_000; // 2 minutes
