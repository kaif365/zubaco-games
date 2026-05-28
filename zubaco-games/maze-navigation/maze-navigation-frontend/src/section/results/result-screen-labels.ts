import type { ResultScreenLabels } from "@/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "YOUR SCORE",
  chipLabel: "You’re Doing Awesome",
  headingLeading: "Well done! You’ve completed the",
  headingHighlight: " stage",
  headingTrailing: "",
  subheading: "Keep it up for the upcoming games.",
  progressLabel: "Progress",
  progressSuffixLabel: "Games completed",
  ctaLabel: "Continue",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "YOUR SCORE",
  chipLabel: "You gave it a try!",
  headingLeading: "Don’t worry, try again in the",
  headingHighlight: " next game!",
  headingTrailing: "",
  subheading: "Keep practicing, you’ll get there!",
  progressLabel: "Progress",
  progressSuffixLabel: "Games completed",
  ctaLabel: "Continue",
};
