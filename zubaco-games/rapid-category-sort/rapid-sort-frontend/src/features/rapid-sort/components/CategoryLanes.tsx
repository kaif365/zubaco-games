import { motion } from 'framer-motion';
import type { CategoryPair, SortDirection } from '@/types/game';

interface CategoryLanesProps {
  category: CategoryPair | null;
  onSwipe: (direction: SortDirection) => void;
  feedback: 'correct' | 'wrong' | 'missed' | null;
}

export function CategoryLanes({ category, onSwipe, feedback }: CategoryLanesProps) {
  if (!category) return null;

  return (
    <div className="absolute inset-0 flex">
      {/* LEFT lane */}
      <motion.button
        className="flex-1 flex items-end justify-center pb-20 relative
          active:bg-blue-500/10 transition-colors"
        onClick={() => onSwipe('left')}
        whileTap={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
      >
        <div className="absolute top-4 left-4 right-0">
          <div className="bg-blue-600/80 text-white text-sm font-bold px-4 py-2 rounded-lg inline-block">
            ? {category.leftCategory}
          </div>
        </div>
        <div className="text-blue-400/40 text-6xl font-black select-none">?</div>
      </motion.button>

      {/* Divider */}
      <div className="w-px bg-gray-700/50 self-stretch" />

      {/* RIGHT lane */}
      <motion.button
        className="flex-1 flex items-end justify-center pb-20 relative
          active:bg-orange-500/10 transition-colors"
        onClick={() => onSwipe('right')}
        whileTap={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}
      >
        <div className="absolute top-4 right-4 left-0 text-right">
          <div className="bg-orange-600/80 text-white text-sm font-bold px-4 py-2 rounded-lg inline-block">
            {category.rightCategory} ?
          </div>
        </div>
        <div className="text-orange-400/40 text-6xl font-black select-none">?</div>
      </motion.button>
    </div>
  );
}
