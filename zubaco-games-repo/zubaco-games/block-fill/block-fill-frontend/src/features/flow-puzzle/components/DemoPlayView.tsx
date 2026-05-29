import { useTranslation } from 'react-i18next';

import { BoardCardFlip, type FlipPhase } from '@/features/flow-puzzle/components/BoardCardFlip';
import { PhaserFlowBoard } from '@/features/flow-puzzle/components/PhaserFlowBoard';
import type {
  FlowPuzzleLevel,
  FlowSessionState,
  FlowWinSummary,
  GridCoord,
} from '@/features/flow-puzzle/types';

interface DemoPlayViewProps {
  level: FlowPuzzleLevel;
  session: FlowSessionState;
  winSummary: FlowWinSummary | null;
  flipPhase?: FlipPhase;
  onBeginPath: (coord: GridCoord) => void;
  onDragPath: (coord: GridCoord) => void;
  onEndPath: () => void;
  onSkip: () => void;
}

export function DemoPlayView({
  level,
  session,
  winSummary,
  flipPhase = 'idle',
  onBeginPath,
  onDragPath,
  onEndPath,
  onSkip,
}: DemoPlayViewProps) {
  const { t } = useTranslation();
  const isSolved = winSummary !== null;
  const boardBusy = isSolved || flipPhase !== 'idle';

  return (
    <div className="mx-auto flex h-[100dvh] min-h-0 w-full max-w-[90%] flex-col items-center gap-4 overflow-hidden py-5">
      <div className="relative flex shrink-0 items-center justify-between min-h-[62px] box-border border-b-0 bg-transparent max-w-[465px] w-full mx-auto px-[15px]">
        <span className="font-semibold text-[16px] md:text-[18px] tracking-[1px] md:uppercase md:tracking-[0.16em] text-white">
          {t('game.demo')}
        </span>
        <button
          type="button"
          className="flex h-[42px] w-[94px] items-center justify-center !text-[14px] tracking-[0.1em] font-medium text-white px-5 py-2 border !border-white/59 !bg-white/18 rounded-full cursor-pointer"
          onClick={onSkip}
        >
          {t('game.done')}
        </button>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <BoardCardFlip flipPhase={flipPhase}>
          <PhaserFlowBoard
            level={level}
            session={session}
            disabled={boardBusy}
            onBeginPath={onBeginPath}
            onDragPath={onDragPath}
            onEndPath={onEndPath}
          />
        </BoardCardFlip>
      </div>
    </div>
  );
}
