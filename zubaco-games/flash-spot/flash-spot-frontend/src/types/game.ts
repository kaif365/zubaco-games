export interface GameConfig {
  timeLimit: number;
  gridSize: number;
  changeCount: number;
  changeIntervalMs: number;
  displayDurationMs: number;
  pointsPerCorrectTap: number;
  penaltyPerWrongTap: number;
  bonusTimeRatio: number;
}

export interface GameSession {
  gameSessionId: string;
  endTime: string | null;
  serverTime: string;
  config: GameConfig;
  grid: GridCell[];
}

export interface GridCell {
  id: number;
  type: string;
  color: string;
  x: number;
  y: number;
}

export interface ChangeEvent {
  cellId: number;
  property: 'color' | 'shape' | 'size' | 'position' | 'opacity';
  fromValue: string;
  toValue: string;
  timestamp: number;
}

export interface TapResult {
  cellId: number;
  isCorrect: boolean;
  timestamp: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  score: number;
  correctTaps: number;
  wrongTaps: number;
  changesDetected: number;
  totalChanges: number;
  timeRemaining: number;
}
