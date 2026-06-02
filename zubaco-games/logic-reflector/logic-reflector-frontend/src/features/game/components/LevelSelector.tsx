import { motion } from 'framer-motion';

// ─── Types & Config ──────────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  gridSize: { x: number; y: number };
  targets: number;
  blocks: number;
  timeLimitSec: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, gridSize: { x: 4, y: 4 }, targets: 1, blocks: 2, timeLimitSec: 120 },
  { level: 2, gridSize: { x: 4, y: 4 }, targets: 1, blocks: 3, timeLimitSec: 110 },
  { level: 3, gridSize: { x: 5, y: 5 }, targets: 2, blocks: 3, timeLimitSec: 100 },
  { level: 4, gridSize: { x: 5, y: 5 }, targets: 2, blocks: 4, timeLimitSec: 95 },
  { level: 5, gridSize: { x: 6, y: 5 }, targets: 2, blocks: 4, timeLimitSec: 90 },
  { level: 6, gridSize: { x: 6, y: 6 }, targets: 3, blocks: 5, timeLimitSec: 85 },
  { level: 7, gridSize: { x: 6, y: 6 }, targets: 3, blocks: 5, timeLimitSec: 80 },
  { level: 8, gridSize: { x: 7, y: 6 }, targets: 3, blocks: 6, timeLimitSec: 75 },
  { level: 9, gridSize: { x: 7, y: 7 }, targets: 4, blocks: 6, timeLimitSec: 70 },
  { level: 10, gridSize: { x: 8, y: 7 }, targets: 4, blocks: 7, timeLimitSec: 60 },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'logic-reflector-levels';

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

const LABELS = ['Beginner', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const highestUnlocked = getHighestLevel();

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Select Level</h2>
        <p className="text-sm text-gray-400 mt-1">Reflect lasers to hit all targets</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {LEVELS.map((config, i) => {
          const isUnlocked = config.level <= highestUnlocked;
          const isCurrent = config.level === highestUnlocked;
          const levelStars = getLevelStars(config.level);
          return (
            <motion.button
              key={config.level}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => isUnlocked && onSelect(config)}
              disabled={!isUnlocked}
              className={`relative flex flex-col items-start rounded-xl p-3 border transition-all ${
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{config.level}</span>
                {!isUnlocked && <span className="text-sm text-gray-600">🔒</span>}
              </div>
              <span className="text-xs text-gray-400 mt-0.5">{LABELS[i]}</span>
              {isUnlocked && (
                <>
                  <div className="text-[10px] text-gray-500 mt-1 leading-tight">
                    {config.gridSize.x}×{config.gridSize.y} · {config.targets} target{config.targets > 1 ? 's' : ''} · {config.blocks} block{config.blocks > 1 ? 's' : ''} · {config.timeLimitSec}s
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={s <= levelStars ? 'text-amber-400' : 'text-gray-600'}>★</span>
                    ))}
                  </div>
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Menu
      </button>
    </motion.div>
  );
}
