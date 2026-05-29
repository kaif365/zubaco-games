import { motion } from 'framer-motion';

interface PauseDialogProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseDialog({ onResume, onRestart, onQuit }: PauseDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <h3 className="text-xl font-bold text-white text-center mb-6">Game Paused</h3>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
          >
            ▶ Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
          >
            ↻ Restart
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold transition-colors"
          >
            ✕ Quit to Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
