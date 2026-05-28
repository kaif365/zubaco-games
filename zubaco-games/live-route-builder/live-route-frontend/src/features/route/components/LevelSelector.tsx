import { motion } from 'framer-motion';

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_PREFIX = 'live-route';

export function getHighestLevel(): number {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem(`${STORAGE_PREFIX}-highest-level`)) || 1;
}

export function setHighestLevel(level: number): void {
  const current = getHighestLevel();
  if (level > current) {
    localStorage.setItem(`${STORAGE_PREFIX}-highest-level`, String(level));
  }
}

export function getLevelStars(level: number): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(`${STORAGE_PREFIX}-level-stars-${level}`)) || 0;
}

export function setLevelStars(level: number, stars: number): void {
  const current = getLevelStars(level);
  if (stars > current) {
    localStorage.setItem(`${STORAGE_PREFIX}-level-stars-${level}`, String(stars));
  }
}

// ─── Level Configurations (mirrors backend levelConfig.ts) ───────────────────

export interface LevelConfig {
  level: number;
  nodeCount: number;
  timeLimitMs: number;
  scoreMultiplier: number;
  label: string;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, nodeCount: 5, timeLimitMs: 60000, scoreMultiplier: 1.0, label: 'Starter' },
  { level: 2, nodeCount: 6, timeLimitMs: 55000, scoreMultiplier: 1.2, label: 'Easy' },
  { level: 3, nodeCount: 7, timeLimitMs: 52000, scoreMultiplier: 1.4, label: 'Simple' },
  { level: 4, nodeCount: 8, timeLimitMs: 50000, scoreMultiplier: 1.6, label: 'Moderate' },
  { level: 5, nodeCount: 9, timeLimitMs: 47000, scoreMultiplier: 1.8, label: 'Intermediate' },
  { level: 6, nodeCount: 10, timeLimitMs: 44000, scoreMultiplier: 2.0, label: 'Challenging' },
  { level: 7, nodeCount: 11, timeLimitMs: 42000, scoreMultiplier: 2.3, label: 'Hard' },
  { level: 8, nodeCount: 12, timeLimitMs: 40000, scoreMultiplier: 2.6, label: 'Expert' },
  { level: 9, nodeCount: 14, timeLimitMs: 37000, scoreMultiplier: 3.0, label: 'Master' },
  { level: 10, nodeCount: 16, timeLimitMs: 35000, scoreMultiplier: 3.5, label: 'Grandmaster' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const highestUnlocked = getHighestLevel();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Select Level</h2>
        <div className="w-16" />
      </div>

      {/* Level Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {LEVELS.map((lvl, i) => {
            const isUnlocked = lvl.level <= highestUnlocked;
            const stars = getLevelStars(lvl.level);

            return (
              <motion.button
                key={lvl.level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => isUnlocked && onSelect(lvl)}
                disabled={!isUnlocked}
                className={`relative rounded-xl border p-4 text-center transition-all ${
                  isUnlocked
                    ? 'border-blue-500/30 bg-slate-800/80 hover:border-blue-400/60 active:scale-95'
                    : 'border-slate-700/30 bg-slate-900/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl font-bold text-white mb-1">
                  {isUnlocked ? lvl.level : '🔒'}
                </div>
                <div className="text-xs text-slate-400 mb-2">{lvl.label}</div>
                <div className="text-xs text-slate-500">
                  {lvl.nodeCount} nodes • {Math.round(lvl.timeLimitMs / 1000)}s
                </div>
                {/* Stars */}
                {isUnlocked && (
                  <div className="mt-2 flex justify-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <span
                        key={s}
                        className={`text-sm ${s <= stars ? 'text-amber-400' : 'text-slate-600'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                {/* Multiplier badge */}
                {isUnlocked && (
                  <div className="absolute top-2 right-2 text-[10px] text-blue-300 font-bold">
                    ×{lvl.scoreMultiplier}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
