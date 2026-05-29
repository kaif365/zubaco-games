import { motion } from 'framer-motion';

interface PauseDialogProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseDialog({ onResume, onRestart, onExit }: PauseDialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-72 rounded-2xl bg-game-surface p-6 text-center shadow-2xl"
      >
        <h2 className="mb-6 text-xl font-bold text-white">Paused</h2>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full rounded-xl bg-game-accent px-4 py-3 text-sm font-semibold text-white"
          >
            ▶ Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-gray-200"
          >
            🔄 Restart
          </button>
          <button
            onClick={onExit}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-gray-400"
          >
            🚪 Exit to Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
