import { useState } from 'react';
import { motion } from 'framer-motion';

interface LevelSelectorProps {
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

interface LevelProgress {
  unlocked: boolean;
  stars: number;
}

const STORAGE_KEY = 'tfblitz_levels';
const TOTAL_LEVELS = 10;

function loadProgress(): LevelProgress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
    unlocked: i === 0,
    stars: 0,
  }));
}

const levelConfigs = [
  { displayTime: 3000, timeLimit: 90 },
  { displayTime: 2800, timeLimit: 80 },
  { displayTime: 2500, timeLimit: 75 },
  { displayTime: 2200, timeLimit: 70 },
  { displayTime: 2000, timeLimit: 65 },
  { displayTime: 1800, timeLimit: 60 },
  { displayTime: 1500, timeLimit: 55 },
  { displayTime: 1300, timeLimit: 50 },
  { displayTime: 1100, timeLimit: 45 },
  { displayTime: 1000, timeLimit: 40 },
];

const difficultyLabels = [
  'Beginner', 'Easy', 'Normal', 'Medium', 'Tricky',
  'Hard', 'Tough', 'Expert', 'Master', 'Legend',
];

export function LevelSelector({ onSelectLevel, onBack }: LevelSelectorProps) {
  const [progress] = useState<LevelProgress[]>(loadProgress);

  const highestUnlocked = progress.reduce(
    (max, lvl, i) => (lvl.unlocked ? i + 1 : max),
    1,
  );

  return (
    <motion.div
      className="flex flex-col items-center min-h-screen px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Select Level</h2>

        <div className="grid grid-cols-2 gap-3">
          {progress.map((lvl, i) => {
            const isCurrent = i + 1 === highestUnlocked;
            const isLocked = !lvl.unlocked;

            return (
              <motion.button
                key={i}
                onClick={() => !isLocked && onSelectLevel(i + 1)}
                disabled={isLocked}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  isCurrent
                    ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20'
                    : isLocked
                      ? 'border-gray-700/50 bg-gray-900/40 opacity-50 cursor-not-allowed'
                      : 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={!isLocked ? { scale: 0.97 } : undefined}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold text-sm">Level {i + 1}</span>
                  {isCurrent && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400" />
                    </span>
                  )}
                  {isLocked && <span className="text-gray-500 text-base">🔒</span>}
                </div>
                <p className="text-xs text-gray-400 mb-1">{difficultyLabels[i]}</p>
                <p className="text-[11px] text-gray-500">
                  Display: {(levelConfigs[i].displayTime / 1000).toFixed(1)}s · Time: {levelConfigs[i].timeLimit}s
                </p>
                {!isLocked && (
                  <p className="text-xs mt-1.5">
                    <span className="text-amber-400">{'★'.repeat(lvl.stars)}</span>
                    <span className="text-gray-600">{'☆'.repeat(3 - lvl.stars)}</span>
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </motion.div>
  );
}
