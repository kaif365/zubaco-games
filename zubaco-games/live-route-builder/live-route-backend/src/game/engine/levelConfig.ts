export interface LevelParams {
  level: number;
  timeLimitMs: number;
  nodeCount: number;
  edgeCount: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, nodeCount: 5, edgeCount: 6, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, nodeCount: 6, edgeCount: 8, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 52000, nodeCount: 7, edgeCount: 10, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 50000, nodeCount: 8, edgeCount: 12, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 47000, nodeCount: 9, edgeCount: 14, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 44000, nodeCount: 10, edgeCount: 16, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 42000, nodeCount: 11, edgeCount: 18, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 40000, nodeCount: 12, edgeCount: 20, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 37000, nodeCount: 14, edgeCount: 24, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 35000, nodeCount: 16, edgeCount: 28, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
