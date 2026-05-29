import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ObjectItem } from '@/types/game';

interface ObjectTrayProps {
  objects: ObjectItem[];
  placedObjectIds: Set<string>;
}

function DraggableObject({ object, isPlaced }: { object: ObjectItem; isPlaced: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tray-${object.id}`,
    data: { object },
    disabled: isPlaced,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl text-2xl
        transition-all duration-150 select-none touch-none
        ${isPlaced
          ? 'bg-gray-700/30 border border-gray-600/20 opacity-30 cursor-not-allowed'
          : isDragging
            ? 'bg-purple-500/40 border-2 border-purple-400 scale-110 shadow-lg shadow-purple-500/20 z-50'
            : 'bg-gray-700/70 border border-gray-500/40 cursor-grab active:cursor-grabbing hover:bg-gray-600/70'
        }`}
      whileHover={!isPlaced ? { scale: 1.05 } : {}}
      whileTap={!isPlaced ? { scale: 0.95 } : {}}
    >
      {object.emoji}
    </motion.div>
  );
}

export function ObjectTray({ objects, placedObjectIds }: ObjectTrayProps) {
  return (
    <motion.div
      className="flex flex-wrap gap-2 justify-center p-4 bg-gray-800/60 rounded-xl border border-gray-600/30 mt-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <p className="w-full text-center text-xs text-gray-400 mb-2">
        Drag objects to their remembered positions
      </p>
      {objects.map((obj) => (
        <DraggableObject
          key={obj.id}
          object={obj}
          isPlaced={placedObjectIds.has(obj.id)}
        />
      ))}
    </motion.div>
  );
}
