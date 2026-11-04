import { defaultGameConfig } from '@/config/gameConfig';
import type { GameConfigResponse } from '@/types/api.types';
import { gameApi } from './game.api';
import { gameKeys } from './game.keys';

export const gameConfigQueryOptions = (stageId: string) => ({
  queryKey: gameKeys.config(stageId),
  queryFn: async (): Promise<GameConfigResponse> => {
    try {
      const res = await gameApi.getConfig(stageId);
      if (res && res.data) return res;
      return { success: true, data: defaultGameConfig };
    } catch {
      return { success: true, data: defaultGameConfig };
    }
  },
  staleTime: Infinity,
  gcTime: Infinity,
});
