import { motion } from 'framer-motion';

interface MenuScreenProps {
  readonly onPlay: () => void;
  readonly onLevels: () => void;
  readonly onDaily: () => void;
  readonly onAchievements: () => void;
  readonly onStats: () => void;
  readonly onSettings: () => void;
}

const MENU_BUTTONS = [
  { key: 'play', label: 'Play', icon: '▶️', color: 'from-blue-600 to-blue-700' },
  { key: 'levels', label: 'Levels', icon: '📋', color: 'from-violet-600 to-violet-700' },
  { key: 'daily', label: 'Daily Challenge', icon: '📅', color: 'from-amber-600 to-amber-700' },
  { key: 'achievements', label: 'Achievements', icon: '🏆', color: 'from-emerald-600 to-emerald-700' },
  { key: 'stats', label: 'Statistics', icon: '📊', color: 'from-pink-600 to-pink-700' },
  { key: 'settings', label: 'Settings', icon: '⚙️', color: 'from-slate-600 to-slate-700' },
] as const;

export function MenuScreen({
  onPlay,
  onLevels,
  onDaily,
  onAchievements,
  onStats,
  onSettings,
}: MenuScreenProps) {
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
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <div className="mb-2 text-5xl">🛤️</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Live Route Builder</h1>
        <p className="mt-1 text-sm text-slate-400">Connect nodes, build efficient paths</p>
      </motion.div>

      {/* Menu Buttons */}
      <div className="w-full max-w-xs space-y-3">
        {MENU_BUTTONS.map((btn, i) => (
          <motion.button
            key={btn.key}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
            onClick={handlers[btn.key]}
            className={`flex w-full items-center gap-3 rounded-xl bg-gradient-to-r ${btn.color} px-5 py-3.5 text-left text-white shadow-lg transition-transform active:scale-[0.97]`}
          >
            <span className="text-xl">{btn.icon}</span>
            <span className="text-sm font-semibold">{btn.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
