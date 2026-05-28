import type { StageId } from './stage-theme';

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

export type GameResultVariant = 'success' | 'failure';

export type GameResultContent = ResultScreenLabels;

export type GameResultContentMap = Record<StageId, GameResultContent>;
