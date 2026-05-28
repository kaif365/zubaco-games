import { motion } from 'framer-motion';

// ─── Types & Config ──────────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  timeLimitMs: number;
  groupCount: number;
  itemsPerGroup: number;
  scoreMultiplier: number;
}

export const LEVELS: LevelConfig[] = [
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

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-groups-levels';

interface LevelData {
  highestUnlocked: number;
  stars: Record<number, number>;
}

function loadData(): LevelData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { highestUnlocked: 1, stars: {} };
}

function saveData(data: LevelData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getHighestLevel(): number {
  return loadData().highestUnlocked;
}

export function setHighestLevel(level: number): void {
  const data = loadData();
  if (level > data.highestUnlocked) {
    data.highestUnlocked = level;
    saveData(data);
  }
}

export function getLevelStars(level: number): number {
  return loadData().stars[level] ?? 0;
}

export function setLevelStars(level: number, stars: number): void {
  const data = loadData();
  if (stars > (data.stars[level] ?? 0)) {
    data.stars[level] = stars;
    saveData(data);
  }
}

/** Star calculation: 3★ = all correct, 2★ = 2/3 correct, 1★ = completed */
export function calculateStars(correctGroups: number, totalGroups: number): number {
  if (correctGroups >= totalGroups) return 3;
  if (correctGroups >= Math.ceil(totalGroups * 0.66)) return 2;
  return 1;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const { highestUnlocked, stars } = loadData();

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Select Level</h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex justify-center">
        <div className="grid grid-cols-5 gap-3 max-w-sm w-full content-start">
          {LEVELS.map((config, i) => {
            const unlocked = config.level <= highestUnlocked;
            const levelStars = stars[config.level] ?? 0;
            return (
              <motion.button
                key={config.level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileTap={unlocked ? { scale: 0.9 } : undefined}
                onClick={() => unlocked && onSelect(config)}
                disabled={!unlocked}
                className={`flex flex-col items-center justify-center rounded-xl aspect-square border transition-all ${
                  unlocked
                    ? 'border-indigo-500/40 bg-gray-800/80 hover:bg-gray-700/80'
                    : 'border-gray-700/30 bg-gray-900/50 opacity-50 cursor-default'
                }`}
              >
                {unlocked ? (
                  <>
                    <span className="text-lg font-bold text-white">{config.level}</span>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={`text-xs ${s <= levelStars ? 'text-amber-400' : 'text-gray-600'}`}>★</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-lg text-gray-600">🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
