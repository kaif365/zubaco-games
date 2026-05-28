import { StageCompleteSummary } from "@/types/game-section";

export const EMPTY_STAGE_COMPLETE_SUMMARY: StageCompleteSummary = {
  totalScore: null,
  score: null,
  boardsCompleted: null,
  boardsTotal: null,
  stageNumber: null,
  stageStatus: null,
  completedLevel: null,
  message: null,
  completionReason: null,
};

export const createEmptyStageCompleteSummary = (): StageCompleteSummary => ({
  ...EMPTY_STAGE_COMPLETE_SUMMARY,
});

export const normalizeHexColor = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) return null;
  return trimmed.toLowerCase();
};
