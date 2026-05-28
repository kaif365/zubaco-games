import type { ResultScreenLabels } from "@micro-screens/src/types/result-content";

export type { ResultScreenLabels };

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Sequence Locked",
  headingLeading: "Perfect recall.",
  headingHighlight: " Every tap on point.",
  headingTrailing: "",
  subheading: "Rhythm and memory — you owned that sequence.",
  progressLabel: "Journey",
  progressSuffixLabel: "rounds complete",
  ctaLabel: "Next",
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: "FINAL SCORE",
  chipLabel: "Sequence broken",
  headingLeading: "The pattern slipped.",
  headingHighlight: " Regroup",
  headingTrailing: " and try again.",
  subheading: "Chunk the sequence into smaller groups — it helps retention.",
  progressLabel: "Journey",
  progressSuffixLabel: "rounds complete",
  ctaLabel: "Next",
};