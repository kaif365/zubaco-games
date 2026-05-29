import type { PlacementAttempt, StageConfig } from '@/types/game';

export interface ScoreResult {
  correctCount: number;
  totalObjects: number;
  baseScore: number;
  timeBonus: number;
  finalScore: number;
  accuracy: number;
}

/**
 * Calculate score based on correct placements and remaining time.
 * Must match server-side scoring exactly.
 *
 * Formula from requirements:
 *   Correct placement: 100 / total_objects pts per correct position
 *   Time Bonus: floor(5 × remaining_time / total_time)
 *   Final: (correct_placements / total_placements) × 100 + time_bonus
 */
export function calculateScore(
  attempts: PlacementAttempt[],
  config: StageConfig,
  remainingTimeMs: number,
): ScoreResult {
  const totalObjects = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalObjects > 0 ? correctCount / totalObjects : 0;

  // Base score: (correct / total) * 100
  const baseScore = Math.round(accuracy * 100);

  // Time bonus: floor(5 * remaining_time / total_time)
  const timeBonus = Math.floor(config.timeBonusMultiplier * (remainingTimeMs / config.recallTimeMs));

  const finalScore = baseScore + timeBonus;

  return {
    correctCount,
    totalObjects,
    baseScore,
    timeBonus,
    finalScore,
    accuracy,
  };
}
