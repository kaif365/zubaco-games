export type GamePhase = 'idle' | 'memorize' | 'recall' | 'submitted' | 'gameover';

export interface ObjectItem {
  id: string;
  type: string;
  emoji: string;
}

export interface GridPlacement {
  cellIndex: number;
  object: ObjectItem;
}

export interface PlacementAttempt {
  objectId: string;
  placedCellIndex: number;
  correctCellIndex: number;
  isCorrect: boolean;
}

export interface StageConfig {
  gridSize: number;
  objectCount: number;
  memorizeTimeMs: number;
  recallTimeMs: number;
  pointsPerCorrect: number;
  timeBonusMultiplier: number;
}

export interface GameSessionResponse {
  gameSessionId: string;
  endTime: string;
  serverTime: string;
  config: StageConfig;
  seed: number;
  objectTypes: string[];
}

export interface SubmitResponse {
  finalScore: number;
  status: string;
  correctCount: number;
  totalObjects: number;
}
