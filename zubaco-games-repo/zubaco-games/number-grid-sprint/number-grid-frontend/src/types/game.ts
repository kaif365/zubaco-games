export interface CellData {
  row: number;
  col: number;
  value: number;
}

export interface CellAnswer {
  row: number;
  col: number;
  value: number;
  timestamp: number;
}

export interface StageConfig {
  gridSize: number;
  revealDurationMs: number;
  hideIntervalMs: number;
  timeLimitMs: number;
  pointsPerCorrect: number;
  timeBonusMultiplier: number;
}

export interface GameSessionResponse {
  gameSessionId: string;
  endTime: string;
  serverTime: string;
  config: StageConfig;
  seed: number;
}

export interface SubmitResponse {
  finalScore: number;
  status: string;
  correctCells: number;
  totalCells: number;
  timeBonus: number;
}
