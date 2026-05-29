import type { ResultScreenLabels } from "@micro-screens/src/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Total Recall",
  headingLeading: "All pairs matched.",
  headingHighlight: " Flawless memory.",
  headingTrailing: "",
  subheading: "Your focus is razor-sharp — on to the next trial.",
  progressLabel: "Journey",
  progressSuffixLabel: "levels complete",
  ctaLabel: "Next",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Close call",
  headingLeading: "A few pairs slipped.",
  headingHighlight: " Train your recall",
  headingTrailing: " and try again.",
  subheading: "Group cards by region — spatial patterns help memory.",
  progressLabel: "Journey",
  progressSuffixLabel: "levels complete",
  ctaLabel: "Next",
};