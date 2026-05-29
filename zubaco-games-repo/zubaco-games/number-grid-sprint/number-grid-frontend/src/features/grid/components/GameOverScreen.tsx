import { motion } from 'framer-motion';
import type { ScoreResult } from '../engine/scorer';

interface Props {
  score: ScoreResult;
  onRestart: () => void;
}

export function GameOverScreen({ score, onRestart }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-6"
    >
      <h1 className="text-4xl font-bold">Grid Complete!</h1>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Final Score</span>
          <span className="text-3xl font-bold text-green-400">{score.finalScore}</span>
        </div>
        <hr className="border-gray-700" />
        <div className="flex justify-between">
          <span className="text-gray-400">Correct</span>
          <span className="text-green-400 font-semibold">{score.correctCells} / {score.totalCells}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Time Bonus</span>
          <span className="text-purple-400 font-semibold">+{score.timeBonus}</span>
        </div>
      </div>
      <button onClick={onRestart} className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-colors">
        Play Again
      </button>
    </motion.div>
  );
}
