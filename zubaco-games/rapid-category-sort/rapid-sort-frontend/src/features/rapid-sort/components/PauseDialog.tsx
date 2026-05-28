import { motion } from 'framer-motion';

interface PauseDialogProps {
  currentItem: number;
  totalItems: number;
  elapsedMs: number;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseDialog({ currentItem, totalItems, elapsedMs, onResume, onRestart, onExit }: PauseDialogProps) {
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-8 mx-4 max-w-xs w-full text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <h2 className="text-2xl font-bold text-white mb-2">Paused</h2>

        <div className="space-y-2 mb-6">
          <div className="text-gray-400 text-sm">
            Item <span className="text-white font-semibold">{currentItem}</span> / {totalItems}
          </div>
          <div className="text-gray-400 text-sm">
            Time: <span className="text-white font-semibold">{timeStr}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
          >
            Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          >
            Restart
          </button>
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium transition-colors"
          >
            Exit to Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
