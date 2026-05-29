import { motion } from 'framer-motion';

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
}

const buttons = [
  { key: 'play', label: '▶ Play', color: 'bg-blue-600 hover:bg-blue-500' },
  { key: 'levels', label: '📊 Levels', color: 'bg-purple-600 hover:bg-purple-500' },
  { key: 'daily', label: '📅 Daily Challenge', color: 'bg-amber-600 hover:bg-amber-500' },
  { key: 'achievements', label: '🏆 Achievements', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { key: 'stats', label: '📈 Statistics', color: 'bg-cyan-600 hover:bg-cyan-500' },
  { key: 'settings', label: '⚙️ Settings', color: 'bg-slate-600 hover:bg-slate-500' },
] as const;

export function MenuScreen({ onPlay, onLevels, onDaily, onAchievements, onStats, onSettings }: Props) {
  const handlers: Record<string, () => void> = { play: onPlay, levels: onLevels, daily: onDaily, achievements: onAchievements, stats: onStats, settings: onSettings };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-4xl font-bold mb-2">🔢 Number Grid Sprint</h1>
        <p className="text-gray-400 text-sm">Memorize flashing numbers, fill the grid!</p>
      </motion.div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {buttons.map((btn, i) => (
          <motion.button
            key={btn.key}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlers[btn.key]}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-lg shadow-lg ${btn.color} transition-colors`}
          >
            {btn.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
