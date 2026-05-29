export interface InfinityLoopProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface InfinityLoopSavePayload {
  userId?: string;
  stageId?: string;
  progress: InfinityLoopProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
