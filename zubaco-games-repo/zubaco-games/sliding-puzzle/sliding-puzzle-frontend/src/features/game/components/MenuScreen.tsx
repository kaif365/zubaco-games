import { motion } from 'framer-motion';

export type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

interface MenuScreenProps {
  onNavigate: (phase: AppPhase) => void;
}

const MENU_BUTTONS: { label: string; phase: AppPhase; color: string; icon: string }[] = [
  { label: 'Play', phase: 'game', color: 'from-amber-600 to-amber-700', icon: '🧩' },
  { label: 'Levels', phase: 'levels', color: 'from-indigo-600 to-indigo-700', icon: '📊' },
  { label: 'Daily Challenge', phase: 'daily', color: 'from-rose-600 to-rose-700', icon: '📅' },
  { label: 'Achievements', phase: 'achievements', color: 'from-emerald-600 to-emerald-700', icon: '🏆' },
  { label: 'Statistics', phase: 'stats', color: 'from-cyan-600 to-cyan-700', icon: '📈' },
  { label: 'Settings', phase: 'settings', color: 'from-slate-600 to-slate-700', icon: '⚙️' },
];

export function MenuScreen({ onNavigate }: MenuScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <motion.div
        className="flex flex-col items-center gap-2 mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-5xl">🧩</span>
        <h1 className="text-3xl font-black text-white tracking-tight">Sliding Puzzle</h1>
        <p className="text-gray-400 text-sm">Slide tiles to reveal the image!</p>
      </motion.div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {MENU_BUTTONS.map((btn, i) => (
          <motion.button
            key={btn.phase}
            onClick={() => onNavigate(btn.phase)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-gradient-to-r ${btn.color} text-white font-semibold shadow-lg transition-all`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-xl">{btn.icon}</span>
            <span>{btn.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
