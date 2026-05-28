import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ObjectItem } from '@/types/game';

interface RecallGridProps {
  gridSize: number;
  userPlacements: Map<number, ObjectItem>;
  onRemove: (cellIndex: number) => void;
}

function DroppableCell({
  cellIndex,
  object,
  onRemove,
}: {
  cellIndex: number;
  object: ObjectItem | undefined;
  onRemove: (cellIndex: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `cell-${cellIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={`aspect-square flex items-center justify-center rounded-lg text-2xl sm:text-3xl
        transition-colors duration-150 cursor-pointer
        ${isOver ? 'bg-blue-500/30 border-2 border-blue-400' : ''}
        ${object ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-gray-700/50 border border-gray-600/30 border-dashed'}`}
      onClick={() => object && onRemove(cellIndex)}
    >
      {object && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {object.emoji}
        </motion.span>
      )}
    </div>
  );
}

export function RecallGrid({ gridSize, userPlacements, onRemove }: RecallGridProps) {
  const totalCells = gridSize * gridSize;

  return (
    <motion.div
      className="grid gap-2 p-3 bg-gray-800/60 rounded-xl border-2 border-blue-500/30"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: totalCells }, (_, idx) => (
        <DroppableCell
          key={idx}
          cellIndex={idx}
          object={userPlacements.get(idx)}
          onRemove={onRemove}
        />
      ))}
    </motion.div>
  );
}
