import type { CellData } from '@/types/game';
import { mulberry32 } from './random';

/**
 * Generate a 6x6 grid with unique values 1-36.
 * Uses PRNG for deterministic generation.
 */
export function generateGrid(seed: number, gridSize: number): CellData[] {
  const rng = mulberry32(seed);
  const totalCells = gridSize * gridSize;

  // Generate values 1 to totalCells, shuffle placement
  const values: number[] = [];
  for (let i = 1; i <= totalCells; i++) values.push(i);

  // Fisher-Yates shuffle with PRNG
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  const cells: CellData[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      cells.push({ row, col, value: values[row * gridSize + col] });
    }
  }
  return cells;
}

/**
 * Generate the reveal schedule: which cells pulse/show at each interval.
 * Each interval reveals a subset of cells for revealDurationMs, then hides them.
 * Over time, all cells are shown multiple times in random groups.
 */
export function generateRevealSchedule(
  seed: number,
  gridSize: number,
  totalIntervals: number,
): number[][] {
  const rng = mulberry32(seed + 7919); // offset seed for schedule
  const totalCells = gridSize * gridSize;
  const cellsPerReveal = Math.ceil(totalCells / 4); // Show ~9 cells at a time

  const schedule: number[][] = [];
  for (let i = 0; i < totalIntervals; i++) {
    const indices: number[] = [];
    const available = Array.from({ length: totalCells }, (_, idx) => idx);
    // Shuffle and pick
    for (let k = available.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [available[k], available[j]] = [available[j], available[k]];
    }
    for (let k = 0; k < cellsPerReveal; k++) {
      indices.push(available[k]);
    }
    schedule.push(indices);
  }
  return schedule;
}
