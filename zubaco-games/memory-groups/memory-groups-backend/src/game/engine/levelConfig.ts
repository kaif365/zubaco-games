export interface LevelParams {
  level: number;
  timeLimitMs: number;
  groupCount: number;
  itemsPerGroup: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 90000, groupCount: 3, itemsPerGroup: 3, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 85000, groupCount: 3, itemsPerGroup: 4, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 80000, groupCount: 4, itemsPerGroup: 4, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 75000, groupCount: 4, itemsPerGroup: 4, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 70000, groupCount: 4, itemsPerGroup: 5, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 65000, groupCount: 5, itemsPerGroup: 4, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 60000, groupCount: 5, itemsPerGroup: 5, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 55000, groupCount: 5, itemsPerGroup: 5, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 50000, groupCount: 6, itemsPerGroup: 5, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 45000, groupCount: 6, itemsPerGroup: 6, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
