export interface NumberGridProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface NumberGridSavePayload {
  userId?: string;
  stageId?: string;
  progress: NumberGridProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
