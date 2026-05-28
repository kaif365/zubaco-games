export const MAZE_COLS = 15;
export const MAZE_ROWS = 10;
export const MAZE_CELL_SIZE = 40;
/** After a junction is reached (and live moves flushed), wait this long before drawing hint arrows; skip if the player moves sooner. */
export const MAZE_JUNCTION_ARROW_REVEAL_DELAY_MS = 420;
/** Minimum ms between accepted movement inputs (matches 0.15s travel tween). */
export const MAZE_MOVE_INPUT_COOLDOWN_MS = 150;
/** After the player stops moving, flush queued live moves if still idle this long. */
export const MAZE_SUBMIT_MOVES_IDLE_FLUSH_MS = 600;
/** Flush immediately when stopped at a junction with at least this many choices (e.g. T or cross). */
export const MAZE_SUBMIT_MOVES_MIN_JUNCTION_EXITS = 3;
export const MAZE_WALL_THICKNESS = 6;
/** Visual extrusion depth for pseudo-3D wall rendering (px). */
export const MAZE_WALL_DEPTH = 4;
export const MAZE_BALL_SIZE = 18;
export const MAZE_START_TIMER = 120;
/** Live HUD: blink timer chip when remaining time is at or below this (seconds). */
export const MAZE_TIMER_LOW_WARNING_SECONDS = 60;
/** Demo: pause on final level complete before leaving the play route. */
export const MAZE_DEMO_COMPLETE_EXIT_DELAY_MS = 600;
export const MAZE_LEVEL_COMPLETE_BASE_SCORE = 50;
export const MAZE_TIMER_SCORE_FACTOR = 0.5;
