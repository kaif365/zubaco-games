import { motion } from 'framer-motion';
import type { ScoreResult } from '../engine/scorer';

interface GameOverScreenProps {
  score: ScoreResult;
  serverScore?: number;
}

export function GameOverScreen({ score, serverScore }: GameOverScreenProps) {
  const displayScore = serverScore ?? score.finalScore;
  const accuracy = Math.round(score.accuracy * 100);

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-8 bg-gray-800/80 rounded-2xl border border-gray-600/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-2xl font-bold text-white">Round Complete!</h2>

      <div className="flex flex-col items-center gap-2">
        <motion.div
          className="text-5xl font-black text-emerald-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          {displayScore}
        </motion.div>
        <span className="text-sm text-gray-400">points</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-400">{score.correctCount}/{score.totalObjects}</div>
          <div className="text-xs text-gray-400">Correct</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-400">{accuracy}%</div>
          <div className="text-xs text-gray-400">Accuracy</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-400">+{score.timeBonus}</div>
          <div className="text-xs text-gray-400">Time Bonus</div>
        </div>
      </div>
    </motion.div>
  );
}
