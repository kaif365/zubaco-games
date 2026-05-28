import { motion, AnimatePresence } from 'framer-motion';
import type { Statement } from '@/types/game';

interface Props {
  statement: Statement | null;
  feedback: 'correct' | 'wrong' | null;
  displayTimeMs: number;
}

export function StatementCard({ statement, feedback, displayTimeMs }: Props) {
  if (!statement) return null;

  const bgColor = feedback === 'correct' ? 'bg-green-900/30 border-green-500' :
                  feedback === 'wrong' ? 'bg-red-900/30 border-red-500' :
                  'bg-gray-800 border-gray-600';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={statement.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.25 }}
        className={`relative flex items-center justify-center min-h-[200px] rounded-2xl border-2 ${bgColor} p-8 mx-4`}
      >
        <p className="text-2xl md:text-3xl font-bold text-center leading-snug">
          {statement.text}
        </p>

        {/* Progress bar (time left for this statement) */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-2xl"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: displayTimeMs / 1000, ease: 'linear' }}
          key={`bar-${statement.id}`}
        />
      </motion.div>
    </AnimatePresence>
  );
}
