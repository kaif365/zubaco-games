interface Tube {
  id: number;
  balls: string[];
  capacity: number;
}

interface ScoringConfig {
  colorCount: number;
  ballsPerTube: number;
  timeLimitMs: number;
  pointsPerSortedTube: number;
  timeBonusMultiplier: number;
}

import { isTubeSorted } from './puzzleGenerator';

export function calculateScore(
  tubes: Tube[],
  totalMoves: number,
  config: ScoringConfig,
  remainingTimeMs: number,
) {
  const sortedTubes = tubes.filter((t) => t.balls.length > 0 && isTubeSorted(t)).length;
  const baseScore = sortedTubes * config.pointsPerSortedTube;
  const optimalMoves = config.colorCount * config.ballsPerTube;
  const efficiencyBonus = Math.max(0, (optimalMoves * 2 - totalMoves)) * 5;
  const timeBonus = Math.floor(config.timeBonusMultiplier * (remainingTimeMs / config.timeLimitMs));
  const finalScore = baseScore + efficiencyBonus + timeBonus;
  return { sortedTubes, totalMoves, efficiencyBonus, timeBonus, finalScore };
}
