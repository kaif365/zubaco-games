import { mulberry32 } from './random';
import type { CellColor } from '../../../types/game';

export function generateSequence(seed: number, round: number, _colors: CellColor[]): number[] {
  const rng = mulberry32(seed + round * 7919);
  const sequence: number[] = [];
  const totalCells = 9; // 3x3 grid
  for (let i = 0; i <= round; i++) {
    sequence.push(Math.floor(rng() * totalCells));
  }
  return sequence;
}

export function generateCellColors(seed: number, round: number, colors: CellColor[]): CellColor[] {
  const rng = mulberry32(seed + round * 3571);
  return Array.from({ length: 9 }, () => colors[Math.floor(rng() * colors.length)]!);
}
