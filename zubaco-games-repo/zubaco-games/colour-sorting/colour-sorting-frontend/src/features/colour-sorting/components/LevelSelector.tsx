import { motion } from 'framer-motion';

interface LevelConfig {
  level: number;
  tubeCount: number;
  colorCount: number;
  timeLimitMs: number;
}

const LEVELS: LevelConfig[] = [
  { level: 1, tubeCount: 5, colorCount: 3, timeLimitMs: 120000 },
  { level: 2, tubeCount: 6, colorCount: 4, timeLimitMs: 110000 },
  { level: 3, tubeCount: 7, colorCount: 5, timeLimitMs: 100000 },
  { level: 4, tubeCount: 8, colorCount: 6, timeLimitMs: 90000 },
  { level: 5, tubeCount: 9, colorCount: 7, timeLimitMs: 80000 },
  { level: 6, tubeCount: 10, colorCount: 8, timeLimitMs: 75000 },
  { level: 7, tubeCount: 11, colorCount: 9, timeLimitMs: 70000 },
  { level: 8, tubeCount: 12, colorCount: 10, timeLimitMs: 65000 },
  { level: 9, tubeCount: 13, colorCount: 11, timeLimitMs: 60000 },
  { level: 10, tubeCount: 14, colorCount: 12, timeLimitMs: 55000 },
];

const LEVEL_LABELS = ['Beginner', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];

interface LevelSelectorProps {
  highestUnlocked: number;
  onSelect: (level: number) => void;
  onBack: () => void;
}

export function LevelSelector({ highestUnlocked, onSelect, onBack }: LevelSelectorProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Select Level</h2>
      <p className="text-sm text-gray-400 text-center">Complete levels to unlock the next one</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {LEVELS.map((lvl, idx) => {
          const isUnlocked = lvl.level <= highestUnlocked;
          const isCurrent = lvl.level === highestUnlocked;
          return (
            <motion.button
              key={lvl.level}
              onClick={() => isUnlocked && onSelect(lvl.level)}
              disabled={!isUnlocked}
              className={`relative p-4 rounded-xl border-2 text-left transition-all
                ${isCurrent
                  ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20'
                  : isUnlocked
                  ? 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                  : 'border-gray-700/50 bg-gray-900/40 opacity-50 cursor-not-allowed'
                }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={isUnlocked ? { scale: 1.03 } : {}}
              whileTap={isUnlocked ? { scale: 0.97 } : {}}
            >
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                  {lvl.level}
                </span>
                {!isUnlocked && (
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div className={`text-xs mt-1 ${isUnlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                {LEVEL_LABELS[idx]}
              </div>
              <div className={`text-xs mt-0.5 ${isUnlocked ? 'text-gray-500' : 'text-gray-700'}`}>
                {lvl.colorCount} colors · {Math.floor(lvl.timeLimitMs / 1000)}s
              </div>
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
