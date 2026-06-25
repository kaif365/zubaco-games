/**
 * Server-side scoring contracts.
 *
 * The platform NEVER trusts a client-reported score. Instead, each game submits
 * a set of *verifiable facts* (the `ScoringMetadata`) describing what happened
 * during play — rounds completed, wrong clicks, hints used, time remaining, the
 * optimal vs. taken path, etc. The server then re-derives the authoritative
 * score from those facts using the formulas defined in the Shunya scope /
 * CURRENT scoring reference.
 *
 * This is the implementation of Phase D, step 23 of the Gaming Engine spec:
 *   "Compares submitted final_state against server-reconstructed expected_state;
 *    calculates authoritative score using scoring formula from scope doc."
 */

/** A single round/board/level outcome reported by a game. */
export interface RoundOutcome {
  /** Whether this round was fully completed/solved/won. */
  completed?: boolean;
  /** Seconds (or ms — normalised by the scorer) remaining when the round ended. */
  timeRemaining?: number;
  /** Total time window for the round in the same unit as timeRemaining. */
  timeTotal?: number;
  /** Spot-the-difference style: incorrect taps. */
  wrongClicks?: number;
  /** Spot-the-difference style: hints consumed. */
  hints?: number;
  /** Number of differences/items found in this round. */
  found?: number;
  /** Total number of differences/items in this round. */
  total?: number;
  /** Arrows removed (Arrows game). */
  arrowsRemoved?: number;
  /** Total arrows in the round (Arrows game). */
  totalArrows?: number;
  /** Maze: length of the optimal/shortest path. */
  shortestPath?: number;
  /** Maze / sliding: moves actually taken. */
  movesTaken?: number;
  /** Block-fill: difficulty label of the board. */
  difficulty?: string;
  /** Generic correct count for a round. */
  correct?: number;
  /** Generic wrong count for a round. */
  wrong?: number;
}

/** Normalised, game-agnostic facts a frontend submits with a result. */
export interface ScoringMetadata {
  /** Per-round / per-board outcomes (memory, spot-diff, maze, arrows, ...). */
  rounds?: RoundOutcome[];
  /** Boards (infinity-loop, block-fill) when a game prefers this key. */
  boards?: RoundOutcome[];
  /** Whole-game time remaining in seconds (used by end-of-game time bonuses). */
  timeRemaining?: number;
  /** Whole-game time window in seconds. */
  timeTotal?: number;
  /** Whole-game time actually taken in seconds (reaction-time games). */
  timeTakenSec?: number;
  /** Whole-game time window in seconds (reaction-time games). */
  windowSec?: number;
  /** Whether the whole game/board was solved (reaction-time games). */
  completed?: boolean;
  /** Sequence games: number of individual correct clicks. */
  correctClicks?: number;
  /** Sequence games: longest correct sequence length reached. */
  sequenceLength?: number;
  /** Whether ANY wrong move was made (gates the time bonus on some games). */
  hadWrong?: boolean;
  /** Generic count of correct answers/actions. */
  correct?: number;
  /** Generic count of wrong answers/actions. */
  wrong?: number;
  /** Memory-card: completed levels. */
  completedLevels?: number;
  /** Memory-card: whether all levels were completed. */
  allCompleted?: boolean;
  /** Object-placement: number of objects placed in their correct cell. */
  correctPlacements?: number;
  /** Colour-sort / path-opt: optimal move/cost benchmark. */
  optimalMoves?: number;
  /** Connections / streak games: number of valid groups found. */
  groupsFound?: number;
  /** Connections / streak games: longest streak of consecutive correct. */
  bestStreak?: number;
  /** Survival games: levels/waves cleared before failure. */
  levelsCleared?: number;
  /** Anything else the game wants to record (not used for scoring). */
  [key: string]: unknown;
}

export interface ScoreBreakdownEntry {
  label: string;
  points: number;
}

export interface ScoreResult {
  /** Authoritative, server-computed score (already clamped to >= 0). */
  score: number;
  /** Theoretical maximum for this config (used for stars / anti-cheat). */
  maxScore: number;
  /** Human-readable component breakdown for audit/debugging. */
  breakdown: ScoreBreakdownEntry[];
  /**
   * True when the server was able to fully re-derive the score from metadata.
   * False means metadata was insufficient and the score was a clamped fallback
   * (the session should be flagged for review).
   */
  validated: boolean;
}
