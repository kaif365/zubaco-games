import type { ResultScreenLabels } from "@micro-screens/src/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Tiles Mastered",
  headingLeading: "Excellent! You reassembled",
  headingHighlight: " the image",
  headingTrailing: " flawlessly.",
  subheading: "Speed and precision — ready for your next trial.",
  progressLabel: "Journey",
  progressSuffixLabel: "puzzles solved",
  ctaLabel: "Next",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Keep sliding",
  headingLeading: "Close! Lock in the",
  headingHighlight: " corners first",
  headingTrailing: " next time.",
  subheading: "Work from edges inward for faster solves.",
  progressLabel: "Journey",
  progressSuffixLabel: "puzzles solved",
  ctaLabel: "Next",
};