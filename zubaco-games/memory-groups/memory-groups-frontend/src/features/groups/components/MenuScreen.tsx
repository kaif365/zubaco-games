import { motion } from 'framer-motion';

interface MenuScreenProps {
  readonly onPlay: () => void;
  readonly onLevels: () => void;
  readonly onDaily: () => void;
  readonly onAchievements: () => void;
  readonly onStats: () => void;
  readonly onSettings: () => void;
}

const MENU_ITEMS = [
  { key: 'play', label: 'Play', icon: '▶️', color: 'bg-indigo-600' },
  { key: 'levels', label: 'Levels', icon: '📝', color: 'bg-purple-600' },
  { key: 'daily', label: 'Daily Challenge', icon: '📅', color: 'bg-amber-600' },
  { key: 'achievements', label: 'Achievements', icon: '🏆', color: 'bg-emerald-600' },
  { key: 'stats', label: 'Statistics', icon: '📊', color: 'bg-cyan-600' },
  { key: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-slate-600' },
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="mb-2 text-4xl">🧠</div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Memory Groups</h1>
        <p className="mt-1 text-sm text-gray-400">Group words by category from memory</p>
      </motion.div>

      <div className="w-full max-w-xs space-y-3">
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlers[item.key]}
            className={`w-full flex items-center gap-3 rounded-xl ${item.color} px-5 py-3.5 text-left font-semibold text-white shadow-lg active:scale-[0.97] transition-transform`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
