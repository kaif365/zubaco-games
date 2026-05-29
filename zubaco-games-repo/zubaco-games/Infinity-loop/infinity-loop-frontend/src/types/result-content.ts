import { GAME_RESULT_VARIANT } from "@/constants/game-result";
import type { StageId } from "./stage-theme";

export interface ResultScreenLabels {
  scoreLabel: string;
  chipLabel: string;
  headingLeading: string;
  headingHighlight: string;
  headingTrailing: string;
  subheading: string;
  progressLabel: string;
  progressSuffixLabel: string;
  ctaLabel: string;
}

export type GameResultVariant =
  (typeof GAME_RESULT_VARIANT)[keyof typeof GAME_RESULT_VARIANT];

export type GameResultContent = ResultScreenLabels;

export type GameResultContentMap = Record<StageId, GameResultContent>;
