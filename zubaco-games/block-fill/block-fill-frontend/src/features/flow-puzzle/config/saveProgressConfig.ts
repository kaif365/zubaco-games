/** Board coverage percent at which the next board is prefetched in the background. */
export const NEXT_BOARD_PREFETCH_COVERAGE_PERCENT = 20;

/**
 * Autosave: flush after this many committed path completions ({@link FlowSessionState.moveCount} deltas).
 */
export const SAVE_PROGRESS_AFTER_COMMITTED_MOVES = 2;

/** Autosave: flush after this idle period since last activity (drag/commit). Timer resets on any path/active-path change. */
export const SAVE_PROGRESS_AFTER_IDLE_MS = 15_000;

/** Minimum gap between overlapping flush attempts (handles burst move threshold + idle). */
export const SAVE_PROGRESS_MIN_FLUSH_INTERVAL_MS = 300;

/** Maximum consecutive save-progress API failures before autosave is halted for the current board. */
export const SAVE_PROGRESS_MAX_FAILURES = 2;
