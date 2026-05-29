export interface LevelParams {
  level: number;
  timeLimitMs: number;
  roundCount: number;
  maxReactionMs: number;
  scoreMultiplier: number;
}

const LEVELS: LevelParams[] = [
  { level: 1, timeLimitMs: 60000, roundCount: 10, maxReactionMs: 1000, scoreMultiplier: 1.0 },
  { level: 2, timeLimitMs: 55000, roundCount: 12, maxReactionMs: 900, scoreMultiplier: 1.2 },
  { level: 3, timeLimitMs: 52000, roundCount: 14, maxReactionMs: 850, scoreMultiplier: 1.4 },
  { level: 4, timeLimitMs: 50000, roundCount: 16, maxReactionMs: 800, scoreMultiplier: 1.6 },
  { level: 5, timeLimitMs: 48000, roundCount: 18, maxReactionMs: 750, scoreMultiplier: 1.8 },
  { level: 6, timeLimitMs: 45000, roundCount: 20, maxReactionMs: 700, scoreMultiplier: 2.0 },
  { level: 7, timeLimitMs: 42000, roundCount: 22, maxReactionMs: 650, scoreMultiplier: 2.3 },
  { level: 8, timeLimitMs: 40000, roundCount: 24, maxReactionMs: 600, scoreMultiplier: 2.6 },
  { level: 9, timeLimitMs: 38000, roundCount: 26, maxReactionMs: 550, scoreMultiplier: 3.0 },
  { level: 10, timeLimitMs: 35000, roundCount: 30, maxReactionMs: 500, scoreMultiplier: 3.5 },
];

export function getLevelConfig(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVELS[clamped - 1]!;
}

export function getMaxLevel(): number {
  return LEVELS.length;
}
