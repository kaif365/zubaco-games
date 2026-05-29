import { motion } from 'framer-motion';
import type { GridPlacement } from '@/types/game';

interface MemorizeGridProps {
  gridSize: number;
  placements: GridPlacement[];
}

export function MemorizeGrid({ gridSize, placements }: MemorizeGridProps) {
  const totalCells = gridSize * gridSize;
  const placementMap = new Map(placements.map((p) => [p.cellIndex, p.object]));

  return (
    <motion.div
      className="grid gap-2 p-3 bg-gray-800/60 rounded-xl border-2 border-yellow-500/50"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: totalCells }, (_, idx) => {
        const obj = placementMap.get(idx);
        return (
          <motion.div
            key={idx}
            className={`aspect-square flex items-center justify-center rounded-lg text-2xl sm:text-3xl
              ${obj ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-gray-700/50 border border-gray-600/30'}`}
            initial={obj ? { scale: 0 } : {}}
            animate={obj ? { scale: 1 } : {}}
            transition={{ delay: 0.1 * (placements.findIndex((p) => p.cellIndex === idx)), type: 'spring' }}
          >
            {obj?.emoji}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
