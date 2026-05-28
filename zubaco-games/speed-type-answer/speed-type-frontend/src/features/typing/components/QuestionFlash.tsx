import { motion } from 'framer-motion';

interface Props { text: string; }
export function QuestionFlash({ text }: Props) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
      className="bg-indigo-600 rounded-2xl px-10 py-8 text-center max-w-lg mx-auto shadow-2xl">
      <p className="text-3xl font-bold text-white">{text}</p>
      <p className="text-indigo-200 mt-2 text-sm">Memorize this!</p>
    </motion.div>
  );
}
