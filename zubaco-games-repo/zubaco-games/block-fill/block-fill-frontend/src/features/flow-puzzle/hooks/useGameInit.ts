import { useQuery } from '@tanstack/react-query';

import { gameConfigQueryOptions } from '@/app/api/gameConfig.query';
import type { GameConfig } from '@/app/api/gameApi';
import { appEnv } from '@/app/config/env';

interface GameInitState {
  gameConfig: GameConfig | null;
  initLoading: boolean;
  initError: string | null;
}

/** Reads game config from the React Query cache (prefetched by AppBootstrapGate). */
export function useGameInit(): GameInitState {
  const stageId = appEnv.userStageId;

  const { data, isPending, isError, error } = useQuery({
    ...gameConfigQueryOptions(stageId ?? ''),
    enabled: Boolean(stageId),
  });

  return {
    gameConfig: data ?? null,
    initLoading: Boolean(stageId) && isPending,
    initError: !stageId
      ? 'Missing stage configuration'
      : isError
        ? error instanceof Error
          ? error.message
          : 'Failed to initialize'
        : null,
  };
}
