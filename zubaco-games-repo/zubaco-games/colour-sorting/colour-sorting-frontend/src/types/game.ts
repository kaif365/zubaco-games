export type BallColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan' | 'lime';

export interface Tube {
  id: number;
  balls: BallColor[];
  capacity: number;
}

export interface GameMove {
  fromTube: number;
  toTube: number;
  color: BallColor;
  timestamp: number;
}

export interface StageConfig {
  tubeCount: number;
  colorCount: number;
  ballsPerTube: number;
  emptyTubes: number;
  timeLimitMs: number;
  pointsPerSortedTube: number;
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
  sortedTubes: number;
  totalMoves: number;
}
