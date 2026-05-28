export interface LevelParams {
  level: number;
  timeLimitMs: number;
  gridSize: number;
  numberCount: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, gridSize: 4, numberCount: 16, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, gridSize: 4, numberCount: 16, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 50000, gridSize: 5, numberCount: 25, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 48000, gridSize: 5, numberCount: 25, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 45000, gridSize: 5, numberCount: 25, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 42000, gridSize: 6, numberCount: 36, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 40000, gridSize: 6, numberCount: 36, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 38000, gridSize: 7, numberCount: 49, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 35000, gridSize: 7, numberCount: 49, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 30000, gridSize: 8, numberCount: 64, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
