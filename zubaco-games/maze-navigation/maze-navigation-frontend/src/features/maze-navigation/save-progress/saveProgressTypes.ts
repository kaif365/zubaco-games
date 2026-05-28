export interface MazeNavigationProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface MazeNavigationSavePayload {
  userId?: string;
  stageId?: string;
  progress: MazeNavigationProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
