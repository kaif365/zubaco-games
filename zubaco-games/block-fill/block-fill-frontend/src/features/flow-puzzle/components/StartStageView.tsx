import { motion } from 'framer-motion';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/alert';

interface StartStageViewProps {
  initLoading: boolean;
  initError: string | null;
  startError: string | null;
  isStartingStage: boolean;
  onStart: () => void;
}

/**
 * Renders the pre-game start screen with loading, error, and start button states.
 *
 * @param props Component props
 */
export function StartStageView({
  initLoading,
  initError,
  startError,
  isStartingStage,
  onStart,
}: StartStageViewProps) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[100dvh] px-4">
      <motion.div
        className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-2xl bg-gray-800/60 border border-gray-700/50 px-6 py-10 text-center backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-white">Stage 1</h1>

        {initLoading ? (
          <Loader text="Initializing…" />
        ) : initError ? (
          <Alert variant="error" title="Initialization Failed" description={initError} />
        ) : (
          <>
            {startError ? (
              <Alert variant="error" title="Start Failed" description={startError} />
            ) : null}
            <motion.button
              className="rounded-xl bg-emerald-600 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onStart}
              disabled={isStartingStage}
              whileHover={!isStartingStage ? { scale: 1.02 } : undefined}
              whileTap={!isStartingStage ? { scale: 0.98 } : undefined}
            >
              {isStartingStage ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Starting…
                </span>
              ) : (
                '▶ Start'
              )}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
}
