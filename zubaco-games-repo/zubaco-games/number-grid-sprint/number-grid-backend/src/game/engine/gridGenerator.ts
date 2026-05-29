import { mulberry32 } from './random';
export interface CellData { row: number; col: number; value: number; }
export function generateGrid(seed: number, gridSize: number): CellData[] {
  const rng = mulberry32(seed);
  const totalCells = gridSize * gridSize;
  const values: number[] = [];
  for (let i = 1; i <= totalCells; i++) values.push(i);
  for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
  const cells: CellData[] = [];
  for (let row = 0; row < gridSize; row++) for (let col = 0; col < gridSize; col++) cells.push({ row, col, value: values[row * gridSize + col] });
  return cells;
}
