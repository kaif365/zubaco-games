export interface LevelParams {
  level: number;
  timeLimitMs: number;
  objectCount: number;
  memorizeMs: number;
  gridSize: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 90000, objectCount: 3, memorizeMs: 5000, gridSize: 4, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 85000, objectCount: 4, memorizeMs: 4500, gridSize: 4, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 80000, objectCount: 5, memorizeMs: 4000, gridSize: 5, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 75000, objectCount: 5, memorizeMs: 3500, gridSize: 5, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 70000, objectCount: 6, memorizeMs: 3000, gridSize: 5, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 65000, objectCount: 7, memorizeMs: 2800, gridSize: 6, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 60000, objectCount: 8, memorizeMs: 2500, gridSize: 6, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 55000, objectCount: 9, memorizeMs: 2200, gridSize: 6, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 50000, objectCount: 10, memorizeMs: 2000, gridSize: 7, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 45000, objectCount: 12, memorizeMs: 1800, gridSize: 7, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
