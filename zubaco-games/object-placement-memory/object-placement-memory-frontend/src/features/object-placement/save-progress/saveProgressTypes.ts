export interface ObjectPlacementProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface ObjectPlacementSavePayload {
  userId?: string;
  stageId?: string;
  progress: ObjectPlacementProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
