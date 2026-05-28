export interface WordChallenge {
  id: number;
  word: string;
  scrambled: string[];
}

export interface WordAnswer {
  wordIndex: number;
  solved: boolean;
  selectedOrder: number[];
  timeSpentMs: number;
  timestamp: number;
}

export interface StageConfig {
  totalWords: number;
  wordTimeMs: number;
  timeLimitMs: number;
  pointsPerWord: number;
  timeBonusPerSecond: number;
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
  wordsSolved: number;
  wordsTotal: number;
  timeBonus: number;
}
