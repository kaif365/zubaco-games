export interface LevelParams {
  level: number;
  timeLimitMs: number;
  questionCount: number;
  timePerQuestionMs: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, questionCount: 10, timePerQuestionMs: 6000, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, questionCount: 12, timePerQuestionMs: 5000, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 50000, questionCount: 14, timePerQuestionMs: 4500, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 48000, questionCount: 16, timePerQuestionMs: 4000, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 45000, questionCount: 18, timePerQuestionMs: 3500, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 42000, questionCount: 20, timePerQuestionMs: 3000, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 40000, questionCount: 22, timePerQuestionMs: 2800, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 38000, questionCount: 24, timePerQuestionMs: 2500, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 35000, questionCount: 26, timePerQuestionMs: 2200, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 30000, questionCount: 30, timePerQuestionMs: 2000, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
