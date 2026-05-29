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

const STORAGE_KEY = 'wordscramble_levels';
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

export function LevelSelector({ onSelectLevel, onBack }: LevelSelectorProps) {
  const [progress] = useState<LevelProgress[]>(loadProgress);

  return (
    <motion.div
      className="flex flex-col items-center min-h-screen px-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 text-sm">
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-6">Select Level</h2>

        <div className="grid grid-cols-5 gap-3">
          {progress.map((lvl, i) => (
            <motion.button
              key={i}
              onClick={() => lvl.unlocked && onSelectLevel(i + 1)}
              disabled={!lvl.unlocked}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all ${
                lvl.unlocked
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileTap={lvl.unlocked ? { scale: 0.9 } : undefined}
            >
              {lvl.unlocked ? (
                <>
                  <span>{i + 1}</span>
                  <span className="text-[10px] mt-0.5">
                    {'⭐'.repeat(lvl.stars)}{'☆'.repeat(3 - lvl.stars)}
                  </span>
                </>
              ) : (
                <span>🔒</span>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Higher levels = longer words & less time per word</p>
        </div>
      </div>
    </motion.div>
  );
}
