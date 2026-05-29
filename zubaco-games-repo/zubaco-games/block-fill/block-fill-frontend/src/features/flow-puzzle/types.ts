export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface GridCoord {
  row: number;
  col: number;
}

export interface FlowNodeDefinition {
  id: string;
  colorId: string;
  colorHex: string;
  glowHex?: string;
  endpoints: [GridCoord, GridCoord];
}

export interface FlowLevelTheme {
  boardGradient: [string, string];
  accent: string;
  backgroundGlow: string;
  name: string;
}

export interface FlowLevelMetadata {
  backendLevelId?: string;
  editorGroupId?: string;
  analyticsKey?: string;
  /** Game service session (`/game/session/start`). */
  sessionId?: string;
  sessionBoardId?: string;
  version: number;
  isDemoRound?: boolean;
  currentDemoRound?: number;
  currentActualRound?: number;
  requestedDemoRound?: number;
  requestedActualRound?: number;
  totalActualRounds?: number;
}

export interface FlowPuzzleLevel {
  schemaVersion: 1;
  id: string;
  slug: string;
  packId: string;
  worldId: string;
  order: number;
  name: string;
  description: string;
  gridSize?: number;
  rows?: number;
  cols?: number;
  timeLimitSec: number;
  difficulty: Difficulty;
  theme: FlowLevelTheme;
  nodes: FlowNodeDefinition[];
  enabledCells?: GridCoord[];
  blockedCells?: GridCoord[];
  objectives?: {
    requireFullCoverage: boolean;
  };
  validation?: {
    referenceSolutionPaths?: FlowPathMap;
  };
  metadata: FlowLevelMetadata;
}

export interface FlowLevelPack {
  id: string;
  backendPackId?: string;
  name: string;
  themeName: string;
  levels: FlowPuzzleLevel[];
}

export type FlowPathMap = Record<string, GridCoord[]>;

export interface ActiveFlowPath {
  colorId: string;
  cells: GridCoord[];
  committedBefore: GridCoord[];
}

export interface FlowSessionState {
  paths: FlowPathMap;
  activePath: ActiveFlowPath | null;
  moveCount: number;
  isSolved: boolean;
}

export interface FlowBoardStats {
  totalRequiredCells: number;
  coveredRequiredCells: number;
  coveragePercent: number;
  completedPairs: number;
  totalPairs: number;
}

export interface FlowWinSummary {
  elapsedMs: number;
  elapsedSec: number;
  score: number;
}
