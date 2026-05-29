export interface SpeedTypeProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface SpeedTypeSavePayload {
  userId?: string;
  stageId?: string;
  progress: SpeedTypeProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
