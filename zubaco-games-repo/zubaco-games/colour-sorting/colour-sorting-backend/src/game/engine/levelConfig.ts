export interface LevelParams {
  level: number;
  timeLimitMs: number;
  tubeCount: number;
  colorCount: number;
  ballsPerTube: number;
  emptyTubes: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 120000, tubeCount: 5, colorCount: 3, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 110000, tubeCount: 6, colorCount: 4, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 100000, tubeCount: 7, colorCount: 5, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 90000, tubeCount: 8, colorCount: 6, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 80000, tubeCount: 9, colorCount: 7, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 75000, tubeCount: 10, colorCount: 8, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 70000, tubeCount: 11, colorCount: 9, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 65000, tubeCount: 12, colorCount: 10, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 60000, tubeCount: 13, colorCount: 11, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 55000, tubeCount: 14, colorCount: 12, ballsPerTube: 4, emptyTubes: 2, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
