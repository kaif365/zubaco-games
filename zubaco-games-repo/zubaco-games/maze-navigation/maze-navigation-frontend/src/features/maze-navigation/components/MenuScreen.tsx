import { motion } from 'motion/react';

interface MenuScreenProps {
  readonly onPlay: () => void;
  readonly onLevels: () => void;
  readonly onDaily: () => void;
  readonly onAchievements: () => void;
  readonly onStats: () => void;
  readonly onSettings: () => void;
}

const MENU_ITEMS = [
  { key: 'play', label: 'Play', icon: '▶️', accent: 'from-blue-600 to-blue-700' },
  { key: 'levels', label: 'Levels', icon: '🗺️', accent: 'from-purple-600 to-purple-700' },
  { key: 'daily', label: 'Daily Challenge', icon: '📅', accent: 'from-amber-600 to-amber-700' },
  { key: 'achievements', label: 'Achievements', icon: '🏆', accent: 'from-emerald-600 to-emerald-700' },
  { key: 'stats', label: 'Statistics', icon: '📊', accent: 'from-cyan-600 to-cyan-700' },
  { key: 'settings', label: 'Settings', icon: '⚙️', accent: 'from-slate-600 to-slate-700' },
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
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="mb-2 text-4xl">🧩</div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Maze Navigation</h1>
        <p className="mt-1 text-sm text-slate-400">Find your way through the labyrinth</p>
      </motion.div>

      <div className="w-full max-w-xs space-y-3">
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={handlers[item.key]}
            className={`w-full flex items-center gap-3 rounded-xl bg-gradient-to-r ${item.accent} px-5 py-3.5 text-left font-semibold text-white shadow-lg transition-transform active:scale-[0.97]`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
