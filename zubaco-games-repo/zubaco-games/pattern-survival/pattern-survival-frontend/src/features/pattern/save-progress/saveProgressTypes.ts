export interface PatternSurvivalProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface PatternSurvivalSavePayload {
  userId?: string;
  stageId?: string;
  progress: PatternSurvivalProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
