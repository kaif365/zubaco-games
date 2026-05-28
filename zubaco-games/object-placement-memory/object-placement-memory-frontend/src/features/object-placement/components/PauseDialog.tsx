import { motion } from 'framer-motion';

interface Props {
  placedCount: number;
  totalObjects: number;
  elapsedSec: number;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseDialog({ placedCount, totalObjects, elapsedSec, onResume, onRestart, onExit }: Props) {
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 space-y-4">
        <h2 className="text-2xl font-bold text-center">⏸ Paused</h2>

        <div className="flex justify-around text-center">
          <div>
            <p className="text-lg font-bold">{placedCount}/{totalObjects}</p>
            <p className="text-xs text-gray-400">Objects Placed</p>
          </div>
          <div>
            <p className="text-lg font-bold font-mono">{mm}:{ss}</p>
            <p className="text-xs text-gray-400">Elapsed</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button onClick={onResume} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-colors">Resume</button>
          <button onClick={onRestart} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition-colors">Restart</button>
          <button onClick={onExit} className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-white transition-colors">Exit to Menu</button>
        </div>
      </motion.div>
    </div>
  );
}
