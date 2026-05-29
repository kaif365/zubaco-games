import type { InfinityDifficulty } from "@/constants/infinity-difficulty";
import type { InfinityTileType } from "@/utils/infinity-tile-bitmasks";

export interface InfinityTileCell {
  x: number;
  y: number;
  type: InfinityTileType;
  rotation: number;
  correctRotation: number;
  isCorrect: boolean;
}

export interface InfinityPuzzlePair {
  id: string;
  label: string;
  completeGrid: InfinityTileCell[][];
  randomizedGrid: InfinityTileCell[][];
}

export interface InfinityBoardSettings {
  id: string;
  name: string;
  difficulty: InfinityDifficulty;
  rows: number;
  columns: number;
  generationLimit: number;
  color?: string;
  selectedPuzzlePairId?: string;
  puzzlePairs: InfinityPuzzlePair[];
}
