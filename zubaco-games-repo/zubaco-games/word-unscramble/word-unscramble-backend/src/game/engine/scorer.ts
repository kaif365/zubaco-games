export interface WordAnswer {
  wordIndex: number;
  solved: boolean;
  selectedOrder: number[];
  timeSpentMs: number;
  timestamp: number;
}

export interface StageConfig {
  totalWords: number;
  wordTimeMs: number;
  timeLimitMs: number;
  pointsPerWord: number;
  timeBonusPerSecond: number;
}

export interface ScoreResult {
  wordsSolved: number;
  wordsTotal: number;
  timeBonus: number;
  finalScore: number;
}

export function calculateScore(answers: WordAnswer[], config: StageConfig): ScoreResult {
  const wordsSolved = answers.filter((a) => a.solved).length;
  const wordsTotal = config.totalWords;

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
