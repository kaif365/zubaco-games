export type SortDirection = 'left' | 'right';

export interface CategoryPair {
  id: string;
  leftCategory: string;
  rightCategory: string;
  items: CategoryItem[];
}

export interface CategoryItem {
  id: number;
  text: string;
  correctSide: SortDirection;
}

export interface SortAnswer {
  itemIndex: number;
  chosenSide: SortDirection;
  timestamp: number;
  correct: boolean;
}

export interface StageConfig {
  totalItems: number;
  itemIntervalMs: number;
  itemVisibleMs: number;
  timeLimitMs: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
  categoryPoolSize: number;
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
}
