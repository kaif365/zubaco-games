import { motion } from 'framer-motion';

interface Props {
  row: number;
  col: number;
  revealedValue: number | null;
  playerValue: number | null;
  isSelected: boolean;
  onSelect: (row: number, col: number) => void;
}

export function GridCell({ row, col, revealedValue, playerValue, isSelected, onSelect }: Props) {
  const showRevealed = revealedValue !== null && playerValue === null;

  return (
    <motion.button
      onClick={() => onSelect(row, col)}
      animate={{
        scale: showRevealed ? [1, 1.1, 1] : 1,
        backgroundColor: isSelected ? '#3b82f6' : showRevealed ? '#059669' : playerValue ? '#1e293b' : '#1f2937',
      }}
      transition={{ duration: 0.3 }}
      className={`w-full aspect-square rounded-lg border-2 flex items-center justify-center text-lg font-bold
        ${isSelected ? 'border-blue-400' : showRevealed ? 'border-green-400' : playerValue ? 'border-slate-500' : 'border-gray-600'}`}
    >
      {showRevealed && <span className="text-green-300 text-xl">{revealedValue}</span>}
      {!showRevealed && playerValue && <span className="text-slate-300">{playerValue}</span>}
    </motion.button>
  );
}
