import { motion } from 'framer-motion';
import type { ScoreResult } from '../engine/scorer';

interface GameOverScreenProps {
  score: ScoreResult;
  serverScore?: number;
}

export function GameOverScreen({ score, serverScore }: GameOverScreenProps) {
  const displayScore = serverScore ?? score.finalScore;
  const accuracy = score.totalItems > 0
    ? Math.round((score.correctCount / score.totalItems) * 100)
    : 0;

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-8 bg-gray-800/80 rounded-2xl border border-gray-600/30 mx-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white">Game Over!</h2>

      <motion.div
        className="text-5xl font-black text-emerald-400"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        {displayScore}
      </motion.div>
      <span className="text-sm text-gray-400 -mt-4">points</span>

      <div className="grid grid-cols-4 gap-3 text-center w-full">
        <div>
          <div className="text-lg font-bold text-emerald-400">{score.correctCount}</div>
          <div className="text-xs text-gray-400">Correct</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-400">{score.wrongCount}</div>
          <div className="text-xs text-gray-400">Wrong</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">{score.missedCount}</div>
          <div className="text-xs text-gray-400">Missed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-400">{accuracy}%</div>
          <div className="text-xs text-gray-400">Accuracy</div>
        </div>
      </div>
    </motion.div>
  );
}
