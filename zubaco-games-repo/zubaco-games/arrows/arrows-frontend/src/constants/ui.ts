// ── Zoom ───────────────────────────────────────────────────────────────────────
export const DEFAULT_ZOOM = 50;

// ── Polling / batching intervals (ms) ─────────────────────────────────────────
export const MOVE_BATCH_INTERVAL_MS = 5_000;
export const NEXT_BOARD_DELAY_MS = 2_500;
export const GAME_END_DELAY_MS = 3_500;
export const FETCH_NEXT_ROUND_THRESOLD = 0.1;

// ── Game session status codes ──────────────────────────────────────────────────
export const GAME_SESSION_STATUS = {
  STARTED: 1,
  ENDED: 2,
  EXPIRED: 3,
  RESULT_PROCESSING: 4,
} as const;
