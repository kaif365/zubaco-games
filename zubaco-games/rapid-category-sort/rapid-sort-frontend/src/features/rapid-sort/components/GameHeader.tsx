import { motion } from 'framer-motion';

interface GameHeaderProps {
  timeRemainingMs: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  currentIndex: number;
  totalItems: number;
}

export function GameHeader({ timeRemainingMs, correctCount, wrongCount, streak, currentIndex, totalItems }: GameHeaderProps) {
  const seconds = Math.ceil(timeRemainingMs / 1000);
  const isLow = seconds <= 10;
  const progress = ((currentIndex + 1) / totalItems) * 100;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-3 pointer-events-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-3 text-sm">
          <span className="text-emerald-400 font-bold">? {correctCount}</span>
          <span className="text-red-400 font-bold">? {wrongCount}</span>
        </div>

        {streak >= 3 && (
          <motion.div
            className="text-yellow-400 text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            ?? {streak} streak!
          </motion.div>
        )}

        <motion.div
          className={`text-lg font-bold tabular-nums ${isLow ? 'text-red-400' : 'text-white'}`}
          animate={isLow ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {seconds}s
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
