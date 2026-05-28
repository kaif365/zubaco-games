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
                    ? 'border-purple-500/40 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95'
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
