import { AnimatePresence, motion } from 'framer-motion';

import { GameFailureScreen, GameSuccessScreen } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src';

interface GameResultOverlayProps {
  open: boolean;
  isSuccess: boolean;
  stage: StageId;
  score: number;
  completedRounds: number;
  totalRounds: number;
  onContinue: () => void;
}

export function GameResultOverlay({
  open,
  isSuccess,
  stage,
  score,
  completedRounds,
  totalRounds,
  onContinue,
}: GameResultOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {isSuccess ? (
            <GameSuccessScreen
              stage={stage}
              score={score}
              completedGames={completedRounds}
              totalGames={totalRounds}
              onContinue={onContinue}
            />
          ) : (
            <GameFailureScreen
              stage={stage}
              score={score}
              completedGames={completedRounds}
              totalGames={totalRounds}
              onContinue={onContinue}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
