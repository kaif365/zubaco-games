export interface RapidSortProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface RapidSortSavePayload {
  userId?: string;
  stageId?: string;
  progress: RapidSortProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
