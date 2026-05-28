import { motion, AnimatePresence } from 'framer-motion';

interface PauseDialogProps {
  readonly isOpen: boolean;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
  readonly edges: number;
  readonly timeElapsed: number;
  readonly level: number;
}

export function PauseDialog({
  isOpen,
  onResume,
  onRestart,
  onExit,
  edges,
  timeElapsed,
  level,
}: PauseDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-xs rounded-2xl border border-slate-700/50 bg-slate-900/95 p-6 text-center shadow-2xl"
          >
            <div className="mb-4 text-3xl">⏸️</div>
            <h3 className="mb-1 text-xl font-bold text-white">Paused</h3>
            <p className="mb-4 text-sm text-slate-400">Level {level}</p>

            <div className="mb-6 flex justify-center gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-white">{edges}</p>
                <p className="text-xs text-slate-500">Edges</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{formatTime(timeElapsed)}</p>
                <p className="text-xs text-slate-500">Elapsed</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={onResume}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={onRestart}
                className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-600 transition-colors"
              >
                Restart Level
              </button>
              <button
                onClick={onExit}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Exit to Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
