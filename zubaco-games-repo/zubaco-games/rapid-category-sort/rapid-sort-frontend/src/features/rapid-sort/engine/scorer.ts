import type { StageConfig, SortAnswer } from '@/types/game';

export interface ScoreResult {
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  totalItems: number;
  finalScore: number;
}

/**
 * Scoring from requirements:
 *   Correct sort: pointsPerCorrect (10) per item
 *   Wrong sort: -penaltyPerWrong (5) per item
 *   Missed: -penaltyPerWrong (5) per missed item
 *   No time bonus - speed IS the score
 */
export function calculateScore(
  answers: SortAnswer[],
  totalItems: number,
  config: StageConfig,
): ScoreResult {
  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const missedCount = totalItems - answers.length;

  const finalScore = Math.max(
    0,
    correctCount * config.pointsPerCorrect - wrongCount * config.penaltyPerWrong - missedCount * config.penaltyPerWrong,
  );

  return { correctCount, wrongCount, missedCount, totalItems, finalScore };
}
