export interface LiveRouteProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface LiveRouteSavePayload {
  userId?: string;
  stageId?: string;
  progress: LiveRouteProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
