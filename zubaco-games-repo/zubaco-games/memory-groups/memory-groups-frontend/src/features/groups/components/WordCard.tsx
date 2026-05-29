import { motion } from 'framer-motion';
interface Props { word: string; selected: boolean; disabled: boolean; used: boolean; onClick: () => void; }
export function WordCard({ word, selected, disabled, used, onClick }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled || used}
      className={`px-4 py-3 rounded-lg font-bold text-lg transition-colors ${used ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : selected ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >{word}</motion.button>
  );
}
