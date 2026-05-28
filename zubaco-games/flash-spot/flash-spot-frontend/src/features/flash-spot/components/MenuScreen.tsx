import { motion } from 'framer-motion';

interface MenuScreenProps {
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
  dailyCompleted?: boolean;
}

export function MenuScreen({
  onPlay,
  onLevels,
  onDaily,
  onAchievements,
  onStats,
  onSettings,
  dailyCompleted,
}: MenuScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-game-bg px-6">
      {/* Game icon */}
      <motion.div
        className="mb-4 text-6xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        👁️
      </motion.div>

      <h1 className="mb-1 text-3xl font-bold text-white">Flash Spot</h1>
      <p className="mb-8 text-sm text-gray-400">Spot the changes before they vanish</p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <MenuButton icon="▶" label="Play" onClick={onPlay} primary />
        <MenuButton icon="📋" label="Levels" onClick={onLevels} />
        <MenuButton icon="📅" label="Daily Challenge" onClick={onDaily} badge={dailyCompleted ? '✓' : undefined} />
        <MenuButton icon="🏆" label="Achievements" onClick={onAchievements} />
        <MenuButton icon="📊" label="Stats" onClick={onStats} />
        <MenuButton icon="⚙️" label="Settings" onClick={onSettings} />
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  primary,
  badge,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
  badge?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-5 py-3.5 text-left font-medium transition-colors ${
        primary
          ? 'bg-game-accent text-white shadow-lg shadow-game-accent/20'
          : 'bg-white/5 text-gray-200 hover:bg-white/10'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      {badge && <span className="text-xs text-emerald-400">{badge}</span>}
    </motion.button>
  );
}
