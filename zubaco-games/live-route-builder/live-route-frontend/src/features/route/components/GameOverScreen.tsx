import { motion } from 'framer-motion';
interface Props { score: number; onRestart: () => void; }
export function GameOverScreen({ score, onRestart }: Props) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl z-10">
      <h2 className="text-3xl font-bold text-white mb-2">Route Complete!</h2>
      <p className="text-5xl font-bold text-yellow-400 mb-6">{score}</p>
      <button onClick={onRestart} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-colors">Play Again</button>
    </motion.div>
  );
}
