import type { WordAnswer, StageConfig } from '@/types/game';

export interface ScoreResult {
  wordsSolved: number;
  wordsTotal: number;
  timeBonus: number;
  finalScore: number;
}

/**
 * Scoring:
 *   Solved word: +pointsPerWord (15)
 *   Time bonus: remaining seconds per word solved early × timeBonusPerSecond (1)
 */
export function calculateScore(
  answers: WordAnswer[],
  config: StageConfig,
): ScoreResult {
  const wordsSolved = answers.filter((a) => a.solved).length;
  const wordsTotal = config.totalWords;

  // Time bonus: for each solved word, bonus = seconds remaining in that word's window
  let timeBonus = 0;
  for (const a of answers) {
    if (a.solved) {
      const secondsSaved = Math.max(0, Math.floor((config.wordTimeMs - a.timeSpentMs) / 1000));
      timeBonus += secondsSaved * config.timeBonusPerSecond;
    }
  }

  const finalScore = wordsSolved * config.pointsPerWord + timeBonus;
  return { wordsSolved, wordsTotal, timeBonus, finalScore };
}
