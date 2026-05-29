import type { CellAnswer, CellData, StageConfig } from '@/types/game';

export interface ScoreResult {
  correctCells: number;
  totalCells: number;
  timeBonus: number;
  finalScore: number;
}

export function calculateScore(
  answers: CellAnswer[],
  grid: CellData[],
  timeRemainingMs: number,
  config: StageConfig,
): ScoreResult {
  const totalCells = grid.length;
  let correctCells = 0;

  for (const answer of answers) {
    const cell = grid.find((c) => c.row === answer.row && c.col === answer.col);
    if (cell && cell.value === answer.value) correctCells++;
  }

  const timeBonus = Math.floor((timeRemainingMs / 1000) * config.timeBonusMultiplier);
  const finalScore = correctCells * config.pointsPerCorrect + timeBonus;

  return { correctCells, totalCells, timeBonus, finalScore };
}
