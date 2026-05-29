import { motion } from 'framer-motion';

interface Props {
  built: string;
  targetLength: number;
  onBackspace: () => void;
}

export function WordDisplay({ built, targetLength, onBackspace }: Props) {
  const slots = Array.from({ length: targetLength }, (_, i) => built[i] || null);

  return (
    <div className="flex items-center gap-2 justify-center my-6">
      {slots.map((char, i) => (
        <motion.div
          key={i}
          animate={{ scale: char ? [1.1, 1] : 1 }}
          className={`w-11 h-14 md:w-13 md:h-16 rounded-lg border-2 flex items-center justify-center text-xl font-bold
            ${char ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-gray-600 bg-gray-800/50'}`}
        >
          {char || ''}
        </motion.div>
      ))}
      {built.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBackspace}
          className="ml-2 w-10 h-10 rounded-lg bg-red-600/80 hover:bg-red-500 flex items-center justify-center text-lg"
        >
          ?
        </motion.button>
      )}
    </div>
  );
}
