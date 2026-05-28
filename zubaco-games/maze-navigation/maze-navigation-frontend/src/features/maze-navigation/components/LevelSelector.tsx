import { motion } from 'motion/react';

// ─── Types & Config ──────────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  cols: number;
  rows: number;
  timeLimitSec: number;
  rounds: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, cols: 8, rows: 6, timeLimitSec: 120, rounds: 1 },
  { level: 2, cols: 10, rows: 7, timeLimitSec: 115, rounds: 1 },
  { level: 3, cols: 12, rows: 8, timeLimitSec: 110, rounds: 2 },
  { level: 4, cols: 13, rows: 9, timeLimitSec: 105, rounds: 2 },
  { level: 5, cols: 14, rows: 9, timeLimitSec: 100, rounds: 2 },
  { level: 6, cols: 15, rows: 10, timeLimitSec: 95, rounds: 3 },
  { level: 7, cols: 15, rows: 10, timeLimitSec: 90, rounds: 3 },
  { level: 8, cols: 15, rows: 10, timeLimitSec: 85, rounds: 3 },
  { level: 9, cols: 15, rows: 10, timeLimitSec: 75, rounds: 4 },
  { level: 10, cols: 15, rows: 10, timeLimitSec: 60, rounds: 4 },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'maze-navigation-levels';

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

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const { highestUnlocked, stars } = loadData();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Select Level</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto">
          {LEVELS.map((config, i) => {
            const unlocked = config.level <= highestUnlocked;
            const levelStars = stars[config.level] ?? 0;
            return (
              <motion.button
                key={config.level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => unlocked && onSelect(config)}
                disabled={!unlocked}
                className={`relative flex flex-col items-center justify-center rounded-xl p-3 aspect-square border transition-all ${
                  unlocked
                    ? 'border-blue-500/40 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95'
                    : 'border-slate-700/30 bg-slate-900/50 opacity-50'
                }`}
              >
                {unlocked ? (
                  <>
                    <span className="text-lg font-bold text-white">{config.level}</span>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={`text-xs ${s <= levelStars ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-lg text-slate-600">🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
