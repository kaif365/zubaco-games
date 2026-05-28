import type { ResultScreenLabels } from './types/result-content';

export const SUCCESS_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: 'FINAL SCORE',
  chipLabel: 'Beam Aligned',
  headingLeading: 'Every target hit.',
  headingHighlight: ' Brilliant optics.',
  headingTrailing: '',
  subheading: 'Clean reflections — ready for a tougher grid.',
  progressLabel: 'Journey',
  progressSuffixLabel: 'levels cleared',
  ctaLabel: 'Play Again',
};

export const FAILURE_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: 'FINAL SCORE',
  chipLabel: 'Beam missed',
  headingLeading: 'Some targets still dark.',
  headingHighlight: ' Adjust your mirrors',
  headingTrailing: ' and retry.',
  subheading: 'Try placing splitters near clusters of targets.',
  progressLabel: 'Journey',
  progressSuffixLabel: 'levels cleared',
  ctaLabel: 'Play Again',
};

export const TIME_UP_RESULT_LABELS: ResultScreenLabels = {
  scoreLabel: 'FINAL SCORE',
  chipLabel: 'Time expired',
  headingLeading: 'The clock ran out.',
  headingHighlight: ' Faster placement',
  headingTrailing: ' next round.',
  subheading: 'Pre-plan your block positions before placing them.',
  progressLabel: 'Journey',
  progressSuffixLabel: 'levels cleared',
  ctaLabel: 'Play Again',
};