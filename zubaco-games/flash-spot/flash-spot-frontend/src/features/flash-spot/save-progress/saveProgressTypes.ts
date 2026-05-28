export interface FlashSpotProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface FlashSpotSavePayload {
  userId?: string;
  stageId?: string;
  progress: FlashSpotProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
