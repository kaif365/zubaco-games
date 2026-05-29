import { motion, AnimatePresence } from 'framer-motion';

interface PauseDialogProps {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseDialog({ open, onResume, onRestart, onQuit }: PauseDialogProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onResume}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-72 shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <h3 className="text-xl font-bold text-white text-center mb-6">Game Paused</h3>
            <div className="flex flex-col gap-3">
              <motion.button
                onClick={onResume}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                ▶ Resume
              </motion.button>
              <motion.button
                onClick={onRestart}
                className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                🔄 Restart
              </motion.button>
              <motion.button
                onClick={onQuit}
                className="w-full py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                🚪 Quit to Menu
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
