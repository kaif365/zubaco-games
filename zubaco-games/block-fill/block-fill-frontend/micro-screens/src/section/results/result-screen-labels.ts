import type { ResultScreenLabels } from "@micro-screens/src/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Grid Complete",
  headingLeading: "Every cell filled.",
  headingHighlight: " Perfect flow.",
  headingTrailing: "",
  subheading: "Smooth connections — on to the next board.",
  progressLabel: "Journey",
  progressSuffixLabel: "boards cleared",
  ctaLabel: "Next",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Paths crossed",
  headingLeading: "Some gaps remain.",
  headingHighlight: " Rethink your routes",
  headingTrailing: " and retry.",
  subheading: "Start with the longest paths first to leave room for shorter ones.",
  progressLabel: "Journey",
  progressSuffixLabel: "boards cleared",
  ctaLabel: "Next",
};