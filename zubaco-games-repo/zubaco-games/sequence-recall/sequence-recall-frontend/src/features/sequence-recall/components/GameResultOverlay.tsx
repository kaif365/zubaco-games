import { AnimatePresence, motion } from 'framer-motion';

import type { GameOverReason } from '@/types/api.types';
import { GameFailureScreen, GameSuccessScreen } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src';

interface GameOverData {
  finalScore: number;
  completedRounds: number;
  successfulRounds: number;
  reason: GameOverReason;
}

interface GameResultOverlayProps {
  open: boolean;
  isSuccess: boolean;
  stage: StageId;
  gameOverData: GameOverData | null;
  totalRounds: number;
  onContinue: () => void;
}

/**
 * Full-screen overlay that renders the micro-screens success/failure result screen
 * when the game reaches a terminal phase.
 */
export function GameResultOverlay({
  open,
  isSuccess,
  stage,
  gameOverData,
  totalRounds,
  onContinue,
}: GameResultOverlayProps) {
  const isLoading = gameOverData === null;
  const score = gameOverData?.finalScore ?? 0;
  const completedGames = gameOverData?.successfulRounds ?? 0;
  const resultContent = isLoading ? (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center gap-6"
      style={{ background: '#0e0805' }}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-400" />
    </div>
  ) : isSuccess ? (
    <GameSuccessScreen
      stage={stage}
      score={score}
      completedGames={completedGames}
      totalGames={totalRounds}
      onContinue={onContinue}
    />
  ) : (
    <GameFailureScreen
      stage={stage}
      score={score}
      completedGames={completedGames}
      totalGames={totalRounds}
      onContinue={onContinue}
    />
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="micro-result-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {resultContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
