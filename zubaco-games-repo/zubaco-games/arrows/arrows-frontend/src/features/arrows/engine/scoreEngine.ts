import type { ScoreResult } from './types';

const POINTS_PER_ARROW = 100;
const TIME_BONUS_MULTIPLIER = 2;
const STREAK_BONUS_MULTIPLIER = 50;
const PENALTY_PER_WRONG = 25;
const HINT_PENALTY = 50;

/**
 * Calculates the score for a completed level.
 * Pure function — deterministic output from inputs.
 */
export function calculateScore(params: {
  arrowsCleared: number;
  timeTakenMs: number;
  timeLimitMs: number;
  maxStreak: number;
  wrongMoves: number;
  hintsUsed: number;
  levelIndex: number;
}): ScoreResult {
  const { arrowsCleared, timeTakenMs, timeLimitMs, maxStreak, wrongMoves, hintsUsed, levelIndex } = params;

  // Base score from arrows cleared
  const baseScore = arrowsCleared * POINTS_PER_ARROW;

  // Time bonus: faster completion = more points
  let timeBonus = 0;
  if (timeLimitMs > 0) {
    const remainingMs = Math.max(0, timeLimitMs - timeTakenMs);
    timeBonus = Math.round((remainingMs / 1000) * TIME_BONUS_MULTIPLIER);
  }

  // Streak bonus
  const streakBonus = maxStreak >= 3 ? maxStreak * STREAK_BONUS_MULTIPLIER : 0;

  // Penalties
  const penalty = wrongMoves * PENALTY_PER_WRONG + hintsUsed * HINT_PENALTY;

  // Level multiplier (higher levels = more points)
  const levelMultiplier = 1 + levelIndex * 0.1;

  const total = Math.max(0, Math.round((baseScore + timeBonus + streakBonus - penalty) * levelMultiplier));

  // Star rating
  const stars = calculateStars({ wrongMoves, hintsUsed, timeTakenMs, timeLimitMs });

  return { baseScore, timeBonus, streakBonus, penalty, total, stars };
}

function calculateStars(params: {
  wrongMoves: number;
  hintsUsed: number;
  timeTakenMs: number;
  timeLimitMs: number;
}): 1 | 2 | 3 {
  const { wrongMoves, hintsUsed, timeTakenMs, timeLimitMs } = params;

  // 3 stars: perfect (no wrong moves, no hints, fast time)
  if (wrongMoves === 0 && hintsUsed === 0) {
    if (timeLimitMs > 0 && timeTakenMs < timeLimitMs * 0.5) return 3;
    if (timeLimitMs === 0) return 3;
  }

  // 2 stars: good (≤1 wrong move, ≤1 hint)
  if (wrongMoves <= 1 && hintsUsed <= 1) return 2;

  // 1 star: completed
  return 1;
}
