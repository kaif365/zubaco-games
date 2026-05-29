import type { ResultScreenLabels } from "@micro-screens/src/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Precision Achieved",
  headingLeading: "Nailed it! You dominated",
  headingHighlight: " the grid.",
  headingTrailing: "",
  subheading: "Clean execution. Your next challenge awaits.",
  progressLabel: "Journey",
  progressSuffixLabel: "rounds cleared",
  ctaLabel: "Next",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Almost there",
  headingLeading: "So close — sharpen your",
  headingHighlight: " strategy",
  headingTrailing: " and retry.",
  subheading: "Focus on unblocking edges first, then push inward.",
  progressLabel: "Journey",
  progressSuffixLabel: "rounds cleared",
  ctaLabel: "Next",
};
