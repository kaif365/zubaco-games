export interface LevelParams {
  level: number;
  timeLimitMs: number;
  questionCount: number;
  maxWordLength: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 90000, questionCount: 5, maxWordLength: 6, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 85000, questionCount: 6, maxWordLength: 7, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 80000, questionCount: 7, maxWordLength: 7, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 75000, questionCount: 8, maxWordLength: 8, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 70000, questionCount: 9, maxWordLength: 8, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 65000, questionCount: 10, maxWordLength: 9, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 60000, questionCount: 11, maxWordLength: 10, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 55000, questionCount: 12, maxWordLength: 10, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 50000, questionCount: 14, maxWordLength: 12, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 45000, questionCount: 16, maxWordLength: 14, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
