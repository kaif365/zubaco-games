import { AnimatePresence, motion } from 'framer-motion';

interface GameResultOverlayProps {
  open: boolean;
  isSuccess: boolean;
  stage: number;
  score: number;
  completedRounds: number;
  totalRounds: number;
  isDaily?: boolean;
  onContinue: () => void;
  onMainMenu: () => void;
}

export function GameResultOverlay({
  open,
  isSuccess,
  score,
  completedRounds,
  totalRounds,
  isDaily = false,
  onContinue,
  onMainMenu,
}: GameResultOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-md px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-6 w-full max-w-sm"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            {/* Emoji icon with bounce */}
            <motion.div
              className="text-7xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            >
              {isSuccess ? '🎉' : '⏱️'}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-2xl font-bold text-white text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isSuccess ? 'Puzzle Solved!' : 'Time Up!'}
            </motion.h2>

            {/* Score */}
            <motion.div
              className="text-5xl font-black text-emerald-400 tabular-nums"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.4, stiffness: 250 }}
            >
              {score ?? '—'}
            </motion.div>
            <span className="text-sm text-gray-400 -mt-4">points</span>

            {/* Stats grid */}
            <motion.div
              className="grid grid-cols-2 gap-3 w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50 text-center">
                <div className="text-lg font-bold text-indigo-400">{completedRounds}</div>
                <div className="text-xs text-gray-400">Rounds Done</div>
              </div>
              <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50 text-center">
                <div className="text-lg font-bold text-purple-400">{totalRounds}</div>
                <div className="text-xs text-gray-400">Total Rounds</div>
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Progress</span>
                <span>{totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="flex flex-col gap-3 w-full mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {isSuccess && !isDaily && (
                <motion.button
                  onClick={onContinue}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Next Level →
                </motion.button>
              )}
              {!isSuccess && (
                <motion.button
                  onClick={onContinue}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
              )}
              <motion.button
                onClick={onMainMenu}
                className="w-full py-3 rounded-xl bg-gray-700/80 text-sm font-medium text-gray-300 hover:bg-gray-600/80 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Menu
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Confetti particles for success */}
          {isSuccess && <ConfettiParticles />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfettiParticles() {
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#22c55e'];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[i % colors.length],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation + 720 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
