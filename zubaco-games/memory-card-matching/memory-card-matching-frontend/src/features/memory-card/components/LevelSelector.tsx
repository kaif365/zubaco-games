import { motion } from 'framer-motion';

// ─── Types & Config ──────────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  gridRows: number;
  gridColumns: number;
  pairs: number;
  previewSec: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, gridRows: 2, gridColumns: 3, pairs: 3, previewSec: 5 },
  { level: 2, gridRows: 2, gridColumns: 4, pairs: 4, previewSec: 5 },
  { level: 3, gridRows: 3, gridColumns: 4, pairs: 6, previewSec: 4 },
  { level: 4, gridRows: 3, gridColumns: 4, pairs: 6, previewSec: 3 },
  { level: 5, gridRows: 4, gridColumns: 4, pairs: 8, previewSec: 3 },
  { level: 6, gridRows: 4, gridColumns: 5, pairs: 10, previewSec: 3 },
  { level: 7, gridRows: 4, gridColumns: 5, pairs: 10, previewSec: 2 },
  { level: 8, gridRows: 4, gridColumns: 6, pairs: 12, previewSec: 2 },
  { level: 9, gridRows: 5, gridColumns: 6, pairs: 15, previewSec: 2 },
  { level: 10, gridRows: 5, gridColumns: 6, pairs: 15, previewSec: 1 },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-card-levels';

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

/** Star calculation: 3★ = 0 mismatches, 2★ = ≤2 mismatches, 1★ = completed */
export function calculateStars(mismatches: number): number {
  if (mismatches === 0) return 3;
  if (mismatches <= 2) return 2;
  return 1;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const { highestUnlocked, stars } = loadData();
  const labels = ['Beginner', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 p-4">
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full mt-4">
        {LEVELS.map((config, i) => {
          const isCurrent = config.level === highestUnlocked;
          const isUnlocked = config.level <= highestUnlocked;
          const levelStars = stars[config.level] ?? 0;

          return (
            <motion.button
              key={config.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => isUnlocked && onSelect(config)}
              disabled={!isUnlocked}
              className={`relative flex flex-col items-start p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20'
                  : isUnlocked
                    ? 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                    : 'border-gray-700/50 bg-gray-900/40 opacity-50 cursor-not-allowed'
              }`}
            >
              {isCurrent && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
              <span className="text-xs text-gray-400 font-medium">{labels[i]}</span>
              <span className="text-lg font-bold text-white mt-0.5">Level {config.level}</span>
              <span className="text-xs text-gray-500 mt-1">
                {config.gridRows}×{config.gridColumns} · {config.pairs} pairs · {config.previewSec}s preview
              </span>
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`text-sm ${s <= levelStars ? 'text-amber-400' : 'text-gray-600'}`}>★</span>
                ))}
              </div>
              {!isUnlocked && (
                <span className="absolute inset-0 flex items-center justify-center text-2xl">🔒</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-6 mx-auto text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Menu
      </button>
    </div>
  );
}
