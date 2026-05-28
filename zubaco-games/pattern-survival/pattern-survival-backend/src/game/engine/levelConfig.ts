export interface LevelParams {
  level: number;
  timeLimitMs: number;
  startingLength: number;
  displaySpeedMs: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 120000, startingLength: 3, displaySpeedMs: 800, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 110000, startingLength: 3, displaySpeedMs: 700, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 100000, startingLength: 4, displaySpeedMs: 650, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 95000, startingLength: 4, displaySpeedMs: 600, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 90000, startingLength: 5, displaySpeedMs: 550, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 85000, startingLength: 5, displaySpeedMs: 500, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 80000, startingLength: 6, displaySpeedMs: 450, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 75000, startingLength: 6, displaySpeedMs: 400, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 70000, startingLength: 7, displaySpeedMs: 350, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 65000, startingLength: 8, displaySpeedMs: 300, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
