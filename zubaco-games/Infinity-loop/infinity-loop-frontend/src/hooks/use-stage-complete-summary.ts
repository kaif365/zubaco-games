import React from "react";

import {
  EMPTY_STAGE_COMPLETE_SUMMARY,
  createEmptyStageCompleteSummary,
} from "@/lib/game/game-section-utils";
import { StageCompleteSummary } from "@/types/game-section";

export const useStageCompleteSummary = () => {
  const [stageCompleteSummary, setStageCompleteSummary] =
    React.useState<StageCompleteSummary>(EMPTY_STAGE_COMPLETE_SUMMARY);

  const resetStageCompleteSummary = React.useCallback(() => {
    setStageCompleteSummary(createEmptyStageCompleteSummary());
  }, []);

  return {
    stageCompleteSummary,
    setStageCompleteSummary,
    resetStageCompleteSummary,
  };
};
