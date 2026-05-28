export interface SlidingPuzzleProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface SlidingPuzzleSavePayload {
  userId?: string;
  stageId?: string;
  progress: SlidingPuzzleProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
