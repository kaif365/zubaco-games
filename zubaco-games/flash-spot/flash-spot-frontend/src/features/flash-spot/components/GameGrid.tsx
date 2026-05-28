import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

import type { GridCell } from '@/types/game';
import type { ScheduledChange } from '../engine/changeGenerator';

interface GameGridProps {
  grid: GridCell[];
  gridSize: number;
  activeChanges: Set<number>;
  changes: ScheduledChange[];
  onCellTap: (cellId: number) => void;
  feedback: { cellId: number; correct: boolean } | null;
}

const SHAPE_PATHS: Record<string, string> = {
  circle: 'M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10',
  square: 'M 15 15 H 85 V 85 H 15 Z',
  triangle: 'M 50 10 L 90 85 L 10 85 Z',
  diamond: 'M 50 5 L 90 50 L 50 95 L 10 50 Z',
  hexagon: 'M 50 5 L 90 27 L 90 73 L 50 95 L 10 73 L 10 27 Z',
  star: 'M 50 5 L 61 38 L 95 38 L 68 60 L 79 93 L 50 73 L 21 93 L 32 60 L 5 38 L 39 38 Z',
};

export const GameGrid = memo(function GameGrid({
  grid,
  gridSize,
  activeChanges,
  changes,
  onCellTap,
  feedback,
}: GameGridProps) {
  const cellSize = useMemo(() => {
    const maxWidth = Math.min(window.innerWidth - 32, 400);
    return Math.floor(maxWidth / gridSize);
  }, [gridSize]);

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
      }}
    >
      {grid.map((cell) => {
        const isActive = activeChanges.has(cell.id);
        const change = isActive
          ? changes.find((c) => c.cellId === cell.id)
          : undefined;

        const displayColor = isActive && change?.property === 'color'
          ? change.toValue
          : cell.color;

        const displayShape = isActive && change?.property === 'shape'
          ? change.toValue
          : cell.type;

        const displayScale = isActive && change?.property === 'size'
          ? Number(change.toValue)
          : 1;

        const displayOpacity = isActive && change?.property === 'opacity'
          ? Number(change.toValue)
          : 1;

        const hasFeedback = feedback?.cellId === cell.id;
        const feedbackColor = hasFeedback
          ? feedback.correct
            ? 'ring-4 ring-emerald-400'
            : 'ring-4 ring-red-400'
          : '';

        return (
          <motion.button
            key={cell.id}
            onClick={() => onCellTap(cell.id)}
            animate={{
              scale: displayScale,
              opacity: displayOpacity,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`relative flex items-center justify-center rounded-lg bg-game-surface/50 backdrop-blur-sm ${feedbackColor} active:scale-95 transition-shadow`}
            style={{ width: cellSize, height: cellSize }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              viewBox="0 0 100 100"
              className="h-3/4 w-3/4"
              style={{ filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : 'none' }}
            >
              <path
                d={SHAPE_PATHS[displayShape] ?? SHAPE_PATHS.circle}
                fill={displayColor}
                className="transition-all duration-300"
              />
            </svg>

            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-white/30"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
});
