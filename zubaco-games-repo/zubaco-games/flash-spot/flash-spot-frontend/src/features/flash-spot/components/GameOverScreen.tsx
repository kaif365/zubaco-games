import { motion } from 'framer-motion';

interface GameOverScreenProps {
  score: number;
  accuracy: number;
  correctTaps: number;
  wrongTaps: number;
}

export function GameOverScreen({ score, accuracy, correctTaps, wrongTaps }: GameOverScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-game-bg px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-game-accent/20 bg-game-surface/80 p-8 backdrop-blur-md"
      >
        <h2 className="mb-6 text-center font-game text-2xl font-bold text-game-text">
          Round Complete
        </h2>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="mb-8 text-center"
        >
          <span className="font-game text-5xl font-bold text-game-accent">{score}</span>
          <p className="mt-1 text-sm text-game-text/60">points</p>
        </motion.div>

        <div className="space-y-3">
          <StatRow label="Correct Taps" value={String(correctTaps)} color="text-emerald-400" />
          <StatRow label="Wrong Taps" value={String(wrongTaps)} color="text-red-400" />
          <StatRow label="Accuracy" value={`${Math.round(accuracy * 100)}%`} color="text-game-accent" />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="mt-8 w-full rounded-[14px] bg-violet-600 px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Play Again
        </motion.button>
      </motion.div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-game-bg/50 px-4 py-2">
      <span className="text-sm text-game-text/70">{label}</span>
      <span className={`font-game text-lg font-semibold ${color}`}>{value}</span>
    </div>
  );
}
