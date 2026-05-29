interface SortAnswer {
  itemIndex: number;
  chosenSide: string;
  correct: boolean;
}

interface ScoringConfig {
  totalItems: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
}

export function calculateScore(answers: SortAnswer[], config: ScoringConfig) {
  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const missedCount = config.totalItems - answers.length;

  const finalScore = Math.max(
    0,
    correctCount * config.pointsPerCorrect - wrongCount * config.penaltyPerWrong - missedCount * config.penaltyPerWrong,
  );

  return { correctCount, wrongCount, missedCount, finalScore };
}
