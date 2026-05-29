import { motion } from 'framer-motion';

interface Props {
  onAnswer: (chosenTrue: boolean) => void;
  disabled: boolean;
}

export function AnswerButtons({ onAnswer, disabled }: Props) {
  return (
    <div className="flex gap-4 px-4 mt-6">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className="flex-1 py-6 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-2xl font-bold uppercase tracking-wider transition-colors shadow-lg shadow-green-900/40"
      >
        TRUE
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className="flex-1 py-6 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-2xl font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-900/40"
      >
        FALSE
      </motion.button>
    </div>
  );
}
