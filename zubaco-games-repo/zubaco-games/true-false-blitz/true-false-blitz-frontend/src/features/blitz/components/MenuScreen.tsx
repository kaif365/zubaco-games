import { motion } from 'framer-motion';

interface MenuScreenProps {
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
}

const buttons = [
  { key: 'play', label: '▶ Play', gradient: 'from-green-500 to-emerald-600' },
  { key: 'levels', label: '🎯 Levels', gradient: 'from-indigo-500 to-blue-600' },
  { key: 'daily', label: '📅 Daily Challenge', gradient: 'from-amber-500 to-orange-600' },
  { key: 'achievements', label: '🏆 Achievements', gradient: 'from-yellow-500 to-amber-600' },
  { key: 'stats', label: '📊 Statistics', gradient: 'from-cyan-500 to-teal-600' },
  { key: 'settings', label: '⚙️ Settings', gradient: 'from-gray-500 to-slate-600' },
] as const;

export function MenuScreen({ onPlay, onLevels, onDaily, onAchievements, onStats, onSettings }: MenuScreenProps) {
  const handlers: Record<string, () => void> = {
    play: onPlay,
    levels: onLevels,
    daily: onDaily,
    achievements: onAchievements,
    stats: onStats,
    settings: onSettings,
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 py-8 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-black text-white">⚡ True False Blitz</h1>
        <p className="mt-2 text-gray-400 text-sm">Rapid-fire true or false — beat the clock!</p>
      </motion.div>

      {/* Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        {buttons.map((btn, i) => (
          <motion.button
            key={btn.key}
            onClick={handlers[btn.key]}
            className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${btn.gradient} text-white font-semibold text-base shadow-lg transition-all`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            whileTap={{ scale: 0.97 }}
          >
            {btn.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
