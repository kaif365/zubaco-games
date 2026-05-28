import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';

export function getLevelRows(level: FlowPuzzleLevel) {
  return level.rows ?? level.gridSize ?? 0;
}

export function getLevelCols(level: FlowPuzzleLevel) {
  return level.cols ?? level.gridSize ?? 0;
}
