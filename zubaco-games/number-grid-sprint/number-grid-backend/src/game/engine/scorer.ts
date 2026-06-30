export interface CellAnswer { row: number; col: number; value: number; timestamp: number; }
export interface StageConfig { gridSize: number; revealDurationMs: number; hideIntervalMs: number; timeLimitMs: number; pointsPerCorrect: number; timeBonusMultiplier: number; }
export interface ScoreResult { correctCells: number; totalCells: number; timeBonus: number; finalScore: number; }

import type { CellData } from './gridGenerator';

export function calculateScore(answers: CellAnswer[], grid: CellData[], timeRemainingMs: number, config: StageConfig): ScoreResult {
  const seen = new Set<string>();
  let correctCells = 0;
  for (const a of answers) { const key = `${a.row}:${a.col}`; if (seen.has(key)) continue; seen.add(key); const cell = grid.find((c) => c.row === a.row && c.col === a.col); if (cell && cell.value === a.value) correctCells++; }
  correctCells = Math.min(correctCells, grid.length);
  const timeBonus = Math.floor((timeRemainingMs / 1000) * config.timeBonusMultiplier);
  const finalScore = correctCells * config.pointsPerCorrect + timeBonus;
  return { correctCells, totalCells: grid.length, timeBonus, finalScore };
}
