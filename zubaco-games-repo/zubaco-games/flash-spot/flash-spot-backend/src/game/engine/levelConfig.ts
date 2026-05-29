export interface LevelParams {
  level: number;
  timeLimitMs: number;
  dotCount: number;
  displayMs: number;
  gridSize: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, dotCount: 3, displayMs: 2000, gridSize: 4, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, dotCount: 4, displayMs: 1800, gridSize: 4, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 50000, dotCount: 5, displayMs: 1600, gridSize: 5, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 48000, dotCount: 5, displayMs: 1400, gridSize: 5, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 45000, dotCount: 6, displayMs: 1200, gridSize: 5, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 42000, dotCount: 7, displayMs: 1100, gridSize: 6, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 40000, dotCount: 7, displayMs: 1000, gridSize: 6, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 38000, dotCount: 8, displayMs: 900, gridSize: 6, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 35000, dotCount: 9, displayMs: 800, gridSize: 7, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 30000, dotCount: 10, displayMs: 700, gridSize: 7, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
