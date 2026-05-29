export interface ArrowsProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
  maxStreak: number;
}

export interface ArrowsSavePayload {
  userId?: string;
  stageId?: string;
  progress: ArrowsProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
