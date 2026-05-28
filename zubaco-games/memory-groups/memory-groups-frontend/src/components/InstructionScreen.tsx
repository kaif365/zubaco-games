import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InstructionScreenProps {
  onStart: () => void;
  loading?: boolean;
  gameIcon?: React.ReactNode;
}

export function InstructionScreen({ onStart, loading, gameIcon }: InstructionScreenProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Game icon */}
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        {gameIcon || (
          <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-2xl font-bold text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {t('game.title')}
      </motion.h2>

      {/* Instructions */}
      <motion.p
        className="max-w-sm text-center text-sm leading-relaxed text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {t('game.instructions')}
      </motion.p>

      {/* How to play steps */}
      <motion.div
        className="w-full max-w-sm space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-bold text-indigo-300">1</span>
          <p className="text-xs text-gray-400">{t('game.instructions')}</p>
        </div>
      </motion.div>

      {/* Start button */}
      <motion.button
        onClick={onStart}
        disabled={loading}
        className="mt-4 rounded-xl bg-emerald-600 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 disabled:opacity-50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {loading ? t('game.loading') : t('game.start')}
      </motion.button>
    </motion.div>
  );
}
