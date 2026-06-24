import { motion } from 'framer-motion';
import { GAME_TITLE } from '@/features/flow-puzzle/config/branding';
import type { FlowLevelPack } from '@/features/flow-puzzle/types';

interface HomeScreenProps {
  packs: FlowLevelPack[];
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
  onPlay: () => void;
  onOpenGenerator: () => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
}

export function HomeScreen({
  packs: _packs,
  selectedPackId: _selectedPackId,
  onSelectPack: _onSelectPack,
  onPlay,
  onOpenGenerator: _onOpenGenerator,
  onOpenSettings,
  onOpenStats,
}: HomeScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5 py-8 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="text-5xl mb-2"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        🧩
      </motion.div>
      <h1 className="text-3xl font-black text-white">{GAME_TITLE}</h1>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Connect dots and fill the board before time runs out!
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

        <div className="grid grid-cols-2 gap-2 mt-2">
          {onOpenStats && (
            <motion.button
              onClick={onOpenStats}
              className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
              whileTap={{ scale: 0.95 }}
            >
              📊 Stats
            </motion.button>
          )}
          {onOpenSettings && (
            <motion.button
              onClick={onOpenSettings}
              className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
              whileTap={{ scale: 0.95 }}
            >
              ⚙️ Settings
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
