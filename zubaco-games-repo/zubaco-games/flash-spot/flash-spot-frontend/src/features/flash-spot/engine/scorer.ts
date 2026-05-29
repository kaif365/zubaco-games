import type { TapResult } from '@/types/game';
import type { GameConfig } from '@/types/game';

export interface ScoreResult {
  score: number;
  correctTaps: number;
  wrongTaps: number;
  timeBonus: number;
  accuracy: number;
}

/**
 * Calculate the player's score for a Flash Spot round.
 *
 * Scoring formula:
 *   correctTaps * pointsPerCorrectTap
 *   - wrongTaps * penaltyPerWrongTap
 *   + timeBonus (floor(bonusTimeRatio * remainingSeconds))
 *
 * This is an ESTIMATE shown on client. Server calculates the authoritative score.
 */
export function calculateScore(
  taps: TapResult[],
  config: GameConfig,
  timeRemainingMs: number,
): ScoreResult {
  const correctTaps = taps.filter((t) => t.isCorrect).length;
  const wrongTaps = taps.filter((t) => !t.isCorrect).length;

  const baseScore = correctTaps * config.pointsPerCorrectTap;
  const penalty = wrongTaps * config.penaltyPerWrongTap;
  const timeBonus = Math.floor(config.bonusTimeRatio * (timeRemainingMs / 1000));

  const score = Math.max(0, baseScore - penalty + timeBonus);
  const accuracy = taps.length > 0 ? correctTaps / taps.length : 0;

  return { score, correctTaps, wrongTaps, timeBonus, accuracy };
}
