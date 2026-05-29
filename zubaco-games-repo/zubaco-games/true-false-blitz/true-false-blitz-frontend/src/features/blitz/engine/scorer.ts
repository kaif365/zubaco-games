import type { BlitzAnswer, StageConfig } from '@/types/game';

export interface ScoreResult {
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  streakBonus: number;
  finalScore: number;
}

/**
 * Scoring from requirements:
 *   Correct: +pointsPerCorrect (10)
 *   Wrong: -penaltyPerWrong (5)
 *   Streak bonus: 3+ correct in a row = +streakBonus (5) per streak item
 *   Final: correct × 10 - wrong × 5 + streak_bonus
 */
export function calculateScore(
  answers: BlitzAnswer[],
  totalStatements: number,
  config: StageConfig,
): ScoreResult {
  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const missedCount = totalStatements - answers.length;

  // Calculate streak bonus
  let streakBonus = 0;
  let currentStreak = 0;

  for (const answer of answers) {
    if (answer.correct) {
      currentStreak++;
      if (currentStreak >= config.streakThreshold) {
        streakBonus += config.streakBonus;
      }
    } else {
      currentStreak = 0;
    }
  }

  const finalScore = Math.max(
    0,
    correctCount * config.pointsPerCorrect - wrongCount * config.penaltyPerWrong + streakBonus,
  );

  return { correctCount, wrongCount, missedCount, streakBonus, finalScore };
}
