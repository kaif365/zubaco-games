import { motion } from 'motion/react';

interface PauseDialogProps {
  readonly moves: number;
  readonly timeElapsed: number;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

export function PauseDialog({ moves, timeElapsed, onResume, onRestart, onExit }: PauseDialogProps) {
  const mins = Math.floor(timeElapsed / 60);
  const secs = timeElapsed % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-72 rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-center text-xl font-bold text-white">Paused</h2>

        <div className="mb-6 flex justify-around rounded-xl bg-slate-800/60 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{moves}</p>
            <p className="text-[10px] text-slate-400">Moves</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{mins}:{String(secs).padStart(2, '0')}</p>
            <p className="text-[10px] text-slate-400">Time</p>
          </div>
        </div>

        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onResume}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 font-semibold text-white shadow-lg"
          >
            ▶ Resume
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRestart}
            className="w-full rounded-xl bg-slate-700 py-3 font-semibold text-white"
          >
            ↻ Restart
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onExit}
            className="w-full rounded-xl border border-slate-600 bg-transparent py-3 font-semibold text-slate-300"
          >
            ✕ Exit to Menu
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
