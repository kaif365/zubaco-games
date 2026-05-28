import { motion } from 'framer-motion';

interface MenuScreenProps {
  onPlay: () => void;
  onDaily: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
  isDailyDone?: boolean;
}

export function MenuScreen({ onPlay, onDaily, onAchievements, onStats, onSettings, isDailyDone }: MenuScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="text-5xl mb-2"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        🧪
      </motion.div>
      <h1 className="text-3xl font-black text-white">Colour Sort</h1>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Sort balls by colour before time runs out!
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <motion.button
          onClick={onPlay}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ▶ Play
        </motion.button>

        <motion.button
          onClick={onDaily}
          className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
            isDailyDone
              ? 'bg-gray-700/60 text-gray-400'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          📅 Daily Challenge {isDailyDone && '✓'}
        </motion.button>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <motion.button
            onClick={onAchievements}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            🏆
          </motion.button>
          <motion.button
            onClick={onStats}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            📊
          </motion.button>
          <motion.button
            onClick={onSettings}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            ⚙️
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
