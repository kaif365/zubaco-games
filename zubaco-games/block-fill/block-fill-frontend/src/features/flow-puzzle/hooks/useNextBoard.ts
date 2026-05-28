import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchNextBoard } from '@/app/api/gameApi';
import { mapSessionBoardToFlowLevel } from '@/features/flow-puzzle/utils/backendLevelMapper';
import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';
import type { GameConfig } from '@/app/api/gameApi';

/**
 * Provides a `requestNextBoard` function that computes the correct requested round numbers
 * and fetches + maps the next board from the backend.
 *
 * @param gameConfig The active game config, used to read totalDemoRounds
 * @returns A stable `requestNextBoard` async function
 */
export function useNextBoard(gameConfig: GameConfig | null | undefined) {
  const { mutateAsync: mutateNextBoard } = useMutation({ mutationFn: fetchNextBoard });

  const requestNextBoard = useCallback(
    async (sourceLevel: FlowPuzzleLevel) => {
      const sessionId = sourceLevel.metadata.sessionId;
      if (!sessionId) {
        throw new Error('Missing session id for next-board request');
      }

      const meta = sourceLevel.metadata;
      const totalDemoRounds = gameConfig?.totalDemoRounds ?? 0;
      const totalActualRounds = meta.totalActualRounds ?? 0;

      let requestedDemoRound = 0;
      let requestedActualRound = 0;

      if (meta.isDemoRound) {
        const nextDemo = (meta.requestedDemoRound ?? 0) + 1;
        if (nextDemo <= totalDemoRounds) {
          requestedDemoRound = nextDemo;
        } else {
          requestedActualRound = 1;
        }
      } else {
        const nextActual = (meta.requestedActualRound ?? 0) + 1;
        if (nextActual <= totalActualRounds) {
          requestedActualRound = nextActual;
        }
      }

      const response = await mutateNextBoard({
        sessionId,
        requestedDemoRound,
        requestedActualRound,
      });

      const level = mapSessionBoardToFlowLevel(
        response.board,
        response.stageId,
        response.sessionId,
        response.currentRoundNumber,
        response.totalActualRounds ?? response.totalRounds ?? 0,
        response.isDemoRound,
        response.currentDemoRound,
        response.currentActualRound,
        response.totalActualRounds,
        response.requestedDemoRound,
        response.requestedActualRound,
      );

      return { level, endTime: response.endTime };
    },
    [mutateNextBoard, gameConfig?.totalDemoRounds],
  );

  return requestNextBoard;
}
