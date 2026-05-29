import { motion } from 'framer-motion';

interface MenuScreenProps {
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function MenuScreen({ onPlay, onLevels, onDaily, onAchievements, onStats, onSettings }: MenuScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5 py-8 w-full max-w-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="text-5xl mb-2"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        ➡️
      </motion.div>
      <h1 className="text-3xl font-black text-white">Arrow Puzzle</h1>
      <p className="text-sm text-gray-400 text-center">
        Remove all arrows by tapping them in the right order!
      </p>

      <div className="flex flex-col gap-3 w-full mt-4">
        <motion.button
          onClick={onPlay}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-amber-500/20"
          whileTap={{ scale: 0.97 }}
        >
          ▶ Play
        </motion.button>
        <motion.button
          onClick={onLevels}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all"
          whileTap={{ scale: 0.97 }}
        >
          📋 Levels
        </motion.button>
        <motion.button
          onClick={onDaily}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all"
          whileTap={{ scale: 0.97 }}
        >
          📅 Daily Challenge
        </motion.button>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            onClick={onAchievements}
            className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.97 }}
          >
            🏆
          </motion.button>
          <motion.button
            onClick={onStats}
            className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.97 }}
          >
            📊
          </motion.button>
          <motion.button
            onClick={onSettings}
            className="py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.97 }}
          >
            ⚙️
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
