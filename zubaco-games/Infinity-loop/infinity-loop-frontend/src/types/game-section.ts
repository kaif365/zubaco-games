export interface StageCompleteSummary {
  totalScore: number | null;
  score: number | null;
  boardsCompleted: number | null;
  boardsTotal: number | null;
  stageNumber: string | null;
  stageStatus: string | null;
  completedLevel: string | null;
  message: string | null;
  /** Set when `game:complete:success` indicates a server-side time-up */
  completionReason: "TIME_UP" | null;
}
