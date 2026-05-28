export interface SequenceRecallProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface SequenceRecallSavePayload {
  userId?: string;
  stageId?: string;
  progress: SequenceRecallProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
