import { motion } from 'framer-motion';
import { LEVELS } from '@/lib/game/levels';

const LEVEL_LABELS = ['Tutorial', 'Easy', 'Normal', 'Medium', 'Tricky', 'Hard', 'Tough', 'Expert', 'Master', 'Legend'];

interface LevelSelectorProps {
  unlockedLevel: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function LevelSelector({ unlockedLevel, onSelect, onClose }: LevelSelectorProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Select Level</h2>
      <p className="text-sm text-gray-400 text-center">Complete levels to unlock the next one</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {LEVELS.map((level, idx) => {
          const isUnlocked = idx < unlockedLevel;
          const isCurrent = idx === unlockedLevel - 1;
          return (
            <motion.button
              key={level.id}
              onClick={() => isUnlocked && onSelect(idx)}
              disabled={!isUnlocked}
              className={`relative p-4 rounded-xl border-2 text-left transition-all
                ${isCurrent
                  ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20'
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
                  {level.id}
                </span>
                {!isUnlocked && (
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div className={`text-xs mt-1 ${isUnlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                {LEVEL_LABELS[idx] || level.title}
              </div>
              <div className={`text-xs mt-0.5 ${isUnlocked ? 'text-gray-500' : 'text-gray-700'}`}>
                {level.gridSize}×{level.gridSize} · {level.arrows.length} arrows
              </div>
              {isCurrent && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Menu
      </button>
    </motion.div>
  );
}
