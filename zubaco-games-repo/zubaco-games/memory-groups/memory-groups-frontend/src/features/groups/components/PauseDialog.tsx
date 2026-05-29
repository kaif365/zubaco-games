import { motion } from 'framer-motion';

interface PauseDialogProps {
  readonly groupsFormed: number;
  readonly totalGroups: number;
  readonly timeElapsed: number;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

export function PauseDialog({ groupsFormed, totalGroups, timeElapsed, onResume, onRestart, onExit }: PauseDialogProps) {
  const secs = Math.floor(timeElapsed / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-72 rounded-2xl border border-gray-700/50 bg-gray-900 p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-center text-xl font-bold text-white">Paused</h2>

        <div className="mb-6 flex justify-around rounded-xl bg-gray-800/60 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{groupsFormed}/{totalGroups}</p>
            <p className="text-[10px] text-gray-400">Groups</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{mins}:{String(remainSecs).padStart(2, '0')}</p>
            <p className="text-[10px] text-gray-400">Time</p>
          </div>
        </div>

        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onResume}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg"
          >
            ▶ Resume
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRestart}
            className="w-full rounded-xl bg-gray-700 py-3 font-semibold text-white"
          >
            ↻ Restart
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onExit}
            className="w-full rounded-xl border border-gray-600 bg-transparent py-3 font-semibold text-gray-300"
          >
            ✕ Exit to Menu
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
