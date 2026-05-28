import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ResultScreenProps {
  score: number;
  maxScore?: number;
  success: boolean;
  stats?: { label: string; value: string | number }[];
  onReplay?: () => void;
}

export function ResultScreen({ score, maxScore, success, stats, onReplay }: ResultScreenProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex flex-col items-center gap-5 px-4 py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Result icon */}
      <motion.div
        className={`flex h-20 w-20 items-center justify-center rounded-full ${success ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        {success ? (
          <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        {success ? t('game.solved', 'Well Done!') : t('game.gameOver')}
      </motion.h2>

      {/* Score display */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-4xl font-black text-white">{score}</span>
        {maxScore && (
          <span className="text-sm text-gray-400">/ {maxScore}</span>
        )}
        <span className="text-xs uppercase tracking-wider text-gray-500">{t('game.score')}</span>
      </motion.div>

      {/* Stats grid */}
      {stats && stats.length > 0 && (
        <motion.div
          className="grid w-full max-w-xs grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {stats.map((stat, i) => (
            <div key={i} className="rounded-lg bg-white/5 p-3 text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Replay button */}
      {onReplay && (
        <motion.button
          onClick={onReplay}
          className="mt-4 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {t('game.retry', 'Play Again')}
        </motion.button>
      )}
    </motion.div>
  );
}
