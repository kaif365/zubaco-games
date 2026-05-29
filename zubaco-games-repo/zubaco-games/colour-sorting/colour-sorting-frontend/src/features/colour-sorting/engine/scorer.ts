import type { StageConfig, Tube } from '@/types/game';
import { isTubeSorted } from './puzzleGenerator';

export interface ScoreResult {
  sortedTubes: number;
  totalColorTubes: number;
  totalMoves: number;
  efficiencyBonus: number;
  timeBonus: number;
  finalScore: number;
}

/**
 * Scoring from requirements:
 *   Completed: 100 pts per sorted tube
 *   Moves Efficiency: bonus for fewer moves
 *   Time Bonus: floor(10 × remaining_time / total_time)
 *   Final: sorted_tubes × 100 + efficiency_bonus + time_bonus
 */
export function calculateScore(
  tubes: Tube[],
  totalMoves: number,
  config: StageConfig,
  remainingTimeMs: number,
): ScoreResult {
  // Count sorted tubes (only count non-empty sorted tubes)
  const sortedTubes = tubes.filter((t) => t.balls.length > 0 && isTubeSorted(t)).length;
  const totalColorTubes = config.colorCount;

  // Base score
  const baseScore = sortedTubes * config.pointsPerSortedTube;

  // Efficiency bonus: optimal is roughly colorCount * ballsPerTube moves
  const optimalMoves = config.colorCount * config.ballsPerTube;
  const efficiencyBonus = Math.max(0, (optimalMoves * 2 - totalMoves)) * 5;

  // Time bonus
  const timeBonus = Math.floor(config.timeBonusMultiplier * (remainingTimeMs / config.timeLimitMs));

  const finalScore = baseScore + efficiencyBonus + timeBonus;

  return { sortedTubes, totalColorTubes, totalMoves, efficiencyBonus, timeBonus, finalScore };
}
