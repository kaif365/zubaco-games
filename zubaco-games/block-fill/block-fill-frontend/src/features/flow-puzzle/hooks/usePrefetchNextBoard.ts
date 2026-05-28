import { useEffect, useRef, useState } from 'react';
import { NEXT_BOARD_PREFETCH_COVERAGE_PERCENT } from '@/features/flow-puzzle/config/saveProgressConfig';
import type { FlowPuzzleLevel, FlowBoardStats, FlowWinSummary } from '@/features/flow-puzzle/types';
import type { GameConfig } from '@/app/api/gameApi';

interface UsePrefetchNextBoardParams {
  stageState: string;
  currentLevel: FlowPuzzleLevel | null | undefined;
  stats: FlowBoardStats | null | undefined;
  winSummary: FlowWinSummary | null | undefined;
  gameConfig: GameConfig | null | undefined;
  requestNextBoard: (
    level: FlowPuzzleLevel,
  ) => Promise<{ level: FlowPuzzleLevel; endTime?: string }>;
}

/**
 * Prefetches the next board when coverage reaches the threshold, skipping the request
 * on the last demo round and last actual round.
 *
 * @returns Prefetched level state, its setter, and the ref tracking which level was prefetched for.
 */
export function usePrefetchNextBoard({
  stageState,
  currentLevel,
  stats,
  winSummary,
  gameConfig,
  requestNextBoard,
}: UsePrefetchNextBoardParams) {
  const [prefetchedNextLevel, setPrefetchedNextLevel] = useState<FlowPuzzleLevel | null>(null);
  const prefetchedForLevelIdRef = useRef<string | null>(null);
  const isPrefetchingNextRef = useRef(false);

  useEffect(() => {
    if (stageState !== 'playing' || !currentLevel || !stats || winSummary) {
      return;
    }

    const currentLevelId = currentLevel.id;
    if (
      prefetchedForLevelIdRef.current === currentLevelId ||
      isPrefetchingNextRef.current ||
      prefetchedNextLevel
    ) {
      return;
    }

    if (stats.coveragePercent < NEXT_BOARD_PREFETCH_COVERAGE_PERCENT) {
      return;
    }

    const totalDemoRounds = gameConfig?.totalDemoRounds ?? 0;
    const meta = currentLevel.metadata;

    if (
      meta.isDemoRound &&
      totalDemoRounds > 0 &&
      (meta.requestedDemoRound ?? 0) >= totalDemoRounds
    ) {
      return;
    }

    const totalActualRounds = meta.totalActualRounds ?? 0;
    if (
      !meta.isDemoRound &&
      totalActualRounds > 0 &&
      (meta.requestedActualRound ?? 0) >= totalActualRounds
    ) {
      return;
    }

    prefetchedForLevelIdRef.current = currentLevelId;
    isPrefetchingNextRef.current = true;
    void requestNextBoard(currentLevel)
      .then(({ level }) => {
        setPrefetchedNextLevel(level);
      })
      .catch(() => {
        prefetchedForLevelIdRef.current = null;
      })
      .finally(() => {
        isPrefetchingNextRef.current = false;
      });
  }, [
    currentLevel,
    stats,
    winSummary,
    gameConfig,
    prefetchedNextLevel,
    requestNextBoard,
    stageState,
  ]);

  return { prefetchedNextLevel, setPrefetchedNextLevel, prefetchedForLevelIdRef };
}
