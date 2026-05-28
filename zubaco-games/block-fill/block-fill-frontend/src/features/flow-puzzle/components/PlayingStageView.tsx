import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { BoardCardFlip, type FlipPhase } from '@/features/flow-puzzle/components/BoardCardFlip';
import { PhaserFlowBoard } from '@/features/flow-puzzle/components/PhaserFlowBoard';
import { GameTimer } from '@/features/flow-puzzle/components/GameTimer';
import {
  DEMO_TO_ACTUAL_TRANSITION_MESSAGES,
  FINAL_ROUND_SCORE_MESSAGES,
  ROUND_ADVANCE_BOARD_MESSAGES,
} from '@/features/flow-puzzle/constants/demoRoundMessages';
import { Loader } from '@/components/ui/Loader';
import type { FlowPuzzleLevel, FlowSessionState, GridCoord } from '@/features/flow-puzzle/types';
import type { GameConfig } from '@/app/api/gameApi';

interface PlayingStageViewProps {
  currentLevel: FlowPuzzleLevel;
  session: FlowSessionState;
  gameConfig: GameConfig | null | undefined;
  stageKey: number;
  sessionTimerSeconds: number;
  /** Blocks input and covers the stage while loading the first real round after demos. */
  demoToActualPending?: boolean;
  /** Covers only the puzzle while complete-board / next-board runs between rounds. */
  boardAdvancePending?: boolean;
  /** Which copy to show on the puzzle overlay (`boardAdvancePending` only). */
  boardAdvanceVariant?: 'next-round' | 'score-calculating' | null;
  /** Phase of the card-flip transition between rounds. */
  flipPhase?: FlipPhase;
  onBeginPath: (coord: GridCoord) => void;
  onDragPath: (coord: GridCoord) => void;
  onEndPath: () => void;
  onTimerExpire?: () => void;
}

/**
 * Renders the active gameplay view: level counter, session timer, and the Phaser board.
 *
 * @param props Component props
 */
export function PlayingStageView({
  currentLevel,
  session,
  stageKey,
  sessionTimerSeconds,
  demoToActualPending = false,
  boardAdvancePending = false,
  boardAdvanceVariant = null,
  flipPhase = 'idle',
  onBeginPath,
  onDragPath,
  onEndPath,
  onTimerExpire,
}: PlayingStageViewProps) {
  const { t } = useTranslation();
  const meta = currentLevel.metadata;
  const boardBusy = demoToActualPending || boardAdvancePending || flipPhase !== 'idle';
  const showBoardAdvanceOverlay = boardAdvancePending && !demoToActualPending;

  const boardAdvanceLoaderText =
    boardAdvanceVariant === 'score-calculating'
      ? t(FINAL_ROUND_SCORE_MESSAGES.loader)
      : t(ROUND_ADVANCE_BOARD_MESSAGES.loader);

  const levelLabel = meta.isDemoRound
    ? (meta.requestedDemoRound ?? currentLevel.order)
    : (meta.requestedActualRound ?? currentLevel.order);

  const headerJustifyClass =
    sessionTimerSeconds > 0 ? 'justify-between sm:justify-center sm:flex-col' : 'justify-center';

  return (
    <>
      <div className="mx-auto flex h-[100dvh] w-full max-w-[90%] flex-col items-center overflow-hidden py-4 sm:py-5">
        <div className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-5">
          <div
            className={`flex gap-4 items-center ${headerJustifyClass} sm:items-center sm:px-5 header`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[16px] md:text-[18px] tracking-[1px] md:uppercase md:tracking-[0.16em] text-white">
                {t('game.level')} {levelLabel}
              </p>
              {meta.isDemoRound ? (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                  {t('game.demo')}
                </span>
              ) : null}
            </div>
            <div className="timer-container">
              {sessionTimerSeconds > 0 ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-white">
                    <img
                      src="/timer-icon.svg"
                      alt="Clock icon"
                      className="inline-block w-4"
                    />
                  </span>
                  <GameTimer
                    key={stageKey}
                    totalSeconds={sessionTimerSeconds}
                    running={true}
                    onExpire={onTimerExpire}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="gameplay min-h-0">
            <motion.div
              className="relative flex h-full min-h-0 w-full items-center justify-center"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            >
              {meta.isDemoRound ? <></> : null}

              <div className="relative flex h-full min-h-0 w-full items-center justify-center">
                <BoardCardFlip flipPhase={flipPhase}>
                  <PhaserFlowBoard
                    level={currentLevel}
                    session={session}
                    disabled={boardBusy}
                    onBeginPath={onBeginPath}
                    onDragPath={onDragPath}
                    onEndPath={onEndPath}
                  />

                  {showBoardAdvanceOverlay ? (
                    <motion.div
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 z-20 mx-auto flex flex-col items-center justify-center gap-6 bg-black/80 px-6 py-10 text-center backdrop-blur-md"
                    >
                      <Loader text={boardAdvanceLoaderText} />
                    </motion.div>
                  ) : null}
                </BoardCardFlip>
              </div>

              {demoToActualPending ? (
                <>
                  <motion.div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 mx-auto flex flex-col items-center justify-center gap-6 bg-black/80 px-6 py-10 text-center backdrop-blur-md"
                  >
                    <Loader />
                    <div className="max-w-md space-y-2">
                      <p className="text-lg font-semibold tracking-tight text-white">
                        {t(DEMO_TO_ACTUAL_TRANSITION_MESSAGES.title)}
                      </p>
                      <p className="text-sm leading-relaxed text-white/80">
                        {t(DEMO_TO_ACTUAL_TRANSITION_MESSAGES.body)}
                      </p>
                    </div>
                  </motion.div>
                </>
              ) : null}
            </motion.div>
          </div>
          <div className="for-actions"></div>
        </div>
      </div>
    </>
  );
}
