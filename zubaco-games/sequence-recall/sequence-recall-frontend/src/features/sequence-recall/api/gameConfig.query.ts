import type { GameConfigResponse } from '@/types/api.types';
import { gameApi } from './game.api';
import { gameKeys } from './game.keys';

export const defaultGameConfigResponse: GameConfigResponse = {
  stageId: 'dev-stage-1',
  timeLimit: 60,
  minSequence: 2,
  maxSequence: 50,
  enableDemo: false,
  flashDelay: 350,
  bonusTimeRatio: 1,
  scorePerClick: 10,
  cellCount: 4,
  totalRounds: 10,
  totalDemoRounds: 0,
  wrongMoveHandling: 2, // PLAY_AGAIN
  demoMinSequence: 2,
  demoMaxSequence: 4,
};

export const gameConfigQueryOptions = (stageId: string) => ({
  queryKey: gameKeys.config(stageId),
  queryFn: async (): Promise<GameConfigResponse> => {
    try {
      const res = await gameApi.getConfig(stageId);
      if (res && typeof res.timeLimit === 'number') return res;
      return defaultGameConfigResponse;
    } catch {
      return defaultGameConfigResponse;
    }
  },
  staleTime: Infinity,
  gcTime: Infinity,
});
