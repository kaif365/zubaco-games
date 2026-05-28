export interface Statement {
  id: number;
  text: string;
  isTrue: boolean;
}

export interface BlitzAnswer {
  statementIndex: number;
  chosenTrue: boolean;
  correct: boolean;
  timestamp: number;
}

export interface StageConfig {
  totalStatements: number;
  displayTimeMs: number;
  timeLimitMs: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
  streakThreshold: number;
  streakBonus: number;
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
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  streakBonus: number;
}
