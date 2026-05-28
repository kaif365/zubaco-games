export interface LevelParams {
  level: number;
  timeLimitMs: number;
  itemCount: number;
  categoryCount: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, itemCount: 10, categoryCount: 3, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, itemCount: 12, categoryCount: 3, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 50000, itemCount: 14, categoryCount: 4, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 48000, itemCount: 16, categoryCount: 4, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 45000, itemCount: 18, categoryCount: 4, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 42000, itemCount: 20, categoryCount: 5, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 40000, itemCount: 22, categoryCount: 5, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 38000, itemCount: 24, categoryCount: 5, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 35000, itemCount: 26, categoryCount: 6, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 30000, itemCount: 30, categoryCount: 6, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
