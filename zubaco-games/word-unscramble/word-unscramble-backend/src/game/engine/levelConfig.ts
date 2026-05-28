export interface LevelParams {
  level: number;
  timeLimitMs: number;
  wordCount: number;
  maxWordLength: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 90000, wordCount: 5, maxWordLength: 5, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 85000, wordCount: 6, maxWordLength: 6, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 80000, wordCount: 7, maxWordLength: 6, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 75000, wordCount: 8, maxWordLength: 7, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 70000, wordCount: 9, maxWordLength: 7, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 65000, wordCount: 10, maxWordLength: 8, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 60000, wordCount: 11, maxWordLength: 8, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 55000, wordCount: 12, maxWordLength: 9, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 50000, wordCount: 13, maxWordLength: 10, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 45000, wordCount: 15, maxWordLength: 12, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
