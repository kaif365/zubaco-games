import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onSelect: (level: number) => void;
  onBack: () => void;
}

interface LevelData {
  unlocked: boolean;
  stars: number;
}

const STORAGE_KEY = 'object-placement-levels';

function loadLevels(): LevelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return Array.from({ length: 10 }, (_, i) => ({ unlocked: i === 0, stars: 0 }));
}

export function unlockLevel(level: number, stars: number) {
  const levels = loadLevels();
  if (level <= 10) {
    levels[level - 1].stars = Math.max(levels[level - 1].stars, stars);
    if (level < 10) levels[level].unlocked = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function LevelSelector({ onSelect, onBack }: Props) {
  const [levels, setLevels] = useState<LevelData[]>(loadLevels);

  useEffect(() => { setLevels(loadLevels()); }, []);

  const labels = ['Beginner', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];
  const grids = ['4×4', '4×4', '5×5', '5×5', '5×5', '6×6', '6×6', '6×6', '7×7', '7×7'];
  const objects = [3, 4, 5, 5, 6, 7, 8, 9, 10, 12];
  const memTimes = [5, 5, 4, 4, 4, 3, 3, 3, 2, 2];

  const current = levels.findIndex(l => l.unlocked && l.stars === 0);

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Select Level</h2>
      <p className="text-sm text-gray-400 text-center">Complete levels to unlock the next one</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {levels.map((lvl, i) => {
          const isCurrent = i === current;
          return (
            <motion.button
              key={i}
              onClick={() => lvl.unlocked && onSelect(i + 1)}
              disabled={!lvl.unlocked}
              className={`relative p-4 rounded-xl border-2 text-left transition-all
                ${isCurrent
                  ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20'
                  : lvl.unlocked
                  ? 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                  : 'border-gray-700/50 bg-gray-900/40 opacity-50 cursor-not-allowed'
                }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={lvl.unlocked ? { scale: 1.03 } : {}}
              whileTap={lvl.unlocked ? { scale: 0.97 } : {}}
            >
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${lvl.unlocked ? 'text-white' : 'text-gray-600'}`}>
                  {i + 1}
                </span>
                {!lvl.unlocked && (
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div className={`text-xs mt-1 ${lvl.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                {labels[i]}
              </div>
              <div className={`text-xs mt-0.5 ${lvl.unlocked ? 'text-gray-500' : 'text-gray-700'}`}>
                {grids[i]} · {objects[i]} objects · {memTimes[i]}s memorize
              </div>
              {lvl.unlocked && lvl.stars > 0 && (
                <div className="text-xs mt-1 text-yellow-400">
                  {'★'.repeat(lvl.stars)}{'☆'.repeat(3 - lvl.stars)}
                </div>
              )}
              {isCurrent && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Menu
      </button>
    </motion.div>
  );
}
