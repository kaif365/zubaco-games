export interface BlitzAnswer {
  statementIndex: number;
  chosenTrue: boolean;
  correct: boolean;
  timestamp: number;
}

export interface StageConfig {
  totalStatements: number;
  displayTimeMs: number;
  timeLimitMs: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
  streakThreshold: number;
  streakBonus: number;
}

export interface ScoreResult {
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  streakBonus: number;
  finalScore: number;
}

export function calculateScore(
  answers: BlitzAnswer[],
  totalStatements: number,
  config: StageConfig,
): ScoreResult {
  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const missedCount = totalStatements - answers.length;

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
