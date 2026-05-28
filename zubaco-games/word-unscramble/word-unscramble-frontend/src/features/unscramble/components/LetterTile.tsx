import { motion } from 'framer-motion';

interface Props {
  letter: string;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}

export function LetterTile({ letter, index, selected, onSelect }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      animate={{ scale: selected ? 0.8 : 1, opacity: selected ? 0.3 : 1 }}
      onClick={() => !selected && onSelect(index)}
      disabled={selected}
      className={`w-14 h-14 md:w-16 md:h-16 rounded-xl font-bold text-2xl flex items-center justify-center transition-colors
        ${selected ? 'bg-gray-700 text-gray-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'}`}
    >
      {letter}
    </motion.button>
  );
}
