import { motion, AnimatePresence } from 'framer-motion';
import type { Tube, BallColor } from '@/types/game';
import { isTubeSorted } from '../engine/puzzleGenerator';

const COLOR_MAP: Record<BallColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  lime: '#84cc16',
};

const COLOR_BG: Record<BallColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-400',
  cyan: 'bg-cyan-400',
  lime: 'bg-lime-400',
};

const COLOR_BORDER: Record<BallColor, string> = {
  red: 'border-red-300',
  blue: 'border-blue-300',
  green: 'border-green-300',
  yellow: 'border-yellow-200',
  purple: 'border-purple-300',
  orange: 'border-orange-300',
  pink: 'border-pink-200',
  cyan: 'border-cyan-200',
  lime: 'border-lime-200',
};

interface TubeComponentProps {
  tube: Tube;
  index: number;
  isSelected: boolean;
  isInvalid: boolean;
  isJustCompleted: boolean;
  onTap: (index: number) => void;
}

export function TubeComponent({ tube, index, isSelected, isInvalid, isJustCompleted, onTap }: TubeComponentProps) {
  const emptySlots = tube.capacity - tube.balls.length;
  const isFullySorted = tube.balls.length > 0 && isTubeSorted(tube);

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer select-none"
      onClick={() => onTap(index)}
      whileTap={{ scale: 0.95 }}
      animate={isInvalid ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : {}}
      transition={isInvalid ? { duration: 0.4 } : {}}
    >
      <motion.div
        className={`relative flex flex-col-reverse justify-start items-center gap-1 p-1.5 pt-2 rounded-b-2xl rounded-t-sm
          border-2 border-t-0 w-14 sm:w-16 min-h-[130px] sm:min-h-[150px]
          transition-all duration-150
          ${isSelected
            ? 'border-yellow-400 bg-yellow-500/10 -translate-y-3 shadow-lg shadow-yellow-500/30'
            : isJustCompleted || isFullySorted
            ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
            : 'border-gray-500/60 bg-gray-800/60 hover:border-gray-400/80'
          }`}
        layout
      >
        {/* Completion glow effect */}
        {isJustCompleted && (
          <motion.div
            className="absolute inset-0 rounded-b-2xl rounded-t-sm bg-emerald-400/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1, repeat: 2 }}
          />
        )}

        {/* Sorted checkmark */}
        {isFullySorted && !isJustCompleted && (
          <motion.div
            className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}

        {/* Balls first (appear at bottom with flex-col-reverse = gravity) */}
        <AnimatePresence mode="popLayout">
          {tube.balls.map((color, ballIdx) => (
            <motion.div
              key={`${tube.id}-${ballIdx}`}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${COLOR_BG[color]} ${COLOR_BORDER[color]}
                shadow-lg`}
              style={{ boxShadow: `0 2px 8px ${COLOR_MAP[color]}40` }}
              layout
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: -30 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            />
          ))}
        </AnimatePresence>

        {/* Empty slots after (appear at top with flex-col-reverse = empty space above balls) */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed border-gray-600/30" />
        ))}
      </motion.div>

      {/* Tube label */}
      <span className={`text-xs mt-1.5 font-medium ${
        isSelected ? 'text-yellow-400' :
        isFullySorted ? 'text-emerald-400' :
        'text-gray-500'
      }`}>
        {index + 1}
      </span>
    </motion.div>
  );
}
