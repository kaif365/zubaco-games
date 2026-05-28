import { motion } from 'framer-motion';
import type { GamePhase } from '@/types/game';

interface GameHeaderProps {
  phase: GamePhase;
  timeRemainingMs: number;
  objectCount: number;
  placedCount: number;
}

export function GameHeader({ phase, timeRemainingMs, objectCount, placedCount }: GameHeaderProps) {
  const seconds = Math.ceil(timeRemainingMs / 1000);
  const isLow = seconds <= 5 && phase === 'recall';

  const phaseLabels: Record<GamePhase, string> = {
    idle: 'Ready',
    memorize: '?? MEMORIZE!',
    recall: '?? Place Objects',
    submitted: 'Submitted',
    gameover: 'Game Over',
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 rounded-xl mb-4">
      <div className="text-sm font-medium text-gray-300">
        {phaseLabels[phase]}
      </div>

      {phase === 'recall' && (
        <div className="text-sm text-gray-400">
          {placedCount}/{objectCount} placed
        </div>
      )}

      <motion.div
        className={`text-lg font-bold tabular-nums ${isLow ? 'text-red-400' : 'text-white'}`}
        animate={isLow ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        {phase === 'memorize' && `${seconds}s`}
        {phase === 'recall' && `${seconds}s`}
      </motion.div>
    </div>
  );
}
