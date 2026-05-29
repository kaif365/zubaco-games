export interface ColourSortingProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface ColourSortingSavePayload {
  userId?: string;
  stageId?: string;
  progress: ColourSortingProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
