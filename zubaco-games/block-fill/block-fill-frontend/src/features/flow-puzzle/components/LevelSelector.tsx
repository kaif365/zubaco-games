import { motion } from 'framer-motion';

const STORAGE_KEY = 'blockfill_highest_level';

interface LevelDef {
  level: number;
  label: string;
  desc: string;
}

const LEVELS: LevelDef[] = [
  { level: 1, label: 'Beginner', desc: '5×5 grid · 120s' },
  { level: 2, label: 'Easy', desc: '5×5 grid · 100s' },
  { level: 3, label: 'Normal', desc: '6×6 grid · 90s' },
  { level: 4, label: 'Medium', desc: '7×7 grid · 80s' },
  { level: 5, label: 'Tricky', desc: '7×7 grid · 70s' },
  { level: 6, label: 'Hard', desc: '8×8 grid · 60s' },
  { level: 7, label: 'Expert', desc: '8×8 grid · 55s' },
  { level: 8, label: 'Master', desc: '9×9 grid · 50s' },
  { level: 9, label: 'Insane', desc: '9×9 grid · 45s' },
  { level: 10, label: 'Legend', desc: '10×10 grid · 40s' },
];

export function getHighestLevel(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Math.max(1, parseInt(val, 10) || 1) : 1;
  } catch {
    return 1;
  }
}

export function setHighestLevel(level: number): void {
  try {
    const current = getHighestLevel();
    if (level > current) {
      localStorage.setItem(STORAGE_KEY, String(level));
    }
  } catch {
    /* storage unavailable */
  }
}

interface LevelSelectorProps {
  onSelect: (level: number) => void;
  onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const highestUnlocked = getHighestLevel();

  return (
    <motion.div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Select Level</h2>
      <p className="text-sm text-gray-400 text-center">
        Complete a level to unlock the next one
      </p>

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
              whileHover={isUnlocked ? { scale: 1.03 } : undefined}
              whileTap={isUnlocked ? { scale: 0.97 } : undefined}
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
                {lvl.label}
              </div>
              <div className={`text-xs mt-0.5 ${isUnlocked ? 'text-gray-500' : 'text-gray-700'}`}>
                {lvl.desc}
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
