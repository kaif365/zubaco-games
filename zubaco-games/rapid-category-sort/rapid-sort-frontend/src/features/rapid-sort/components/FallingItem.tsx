import { motion, AnimatePresence } from 'framer-motion';
import type { CategoryItem } from '@/types/game';

interface FallingItemProps {
  item: CategoryItem | null;
  feedback: 'correct' | 'wrong' | 'missed' | null;
}

export function FallingItem({ item, feedback }: FallingItemProps) {
  if (!item) return null;

  const feedbackColor = feedback === 'correct' ? 'border-emerald-400 bg-emerald-500/20'
    : feedback === 'wrong' ? 'border-red-400 bg-red-500/20'
    : 'border-gray-500 bg-gray-800/80';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
          px-8 py-5 rounded-2xl border-2 ${feedbackColor}
          text-2xl font-bold text-white text-center select-none
          shadow-xl backdrop-blur-sm min-w-[140px]`}
        initial={{ opacity: 0, y: -60, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {item.text}
      </motion.div>
    </AnimatePresence>
  );
}
