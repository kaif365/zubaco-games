import { gameApi } from './game.api';
import { gameKeys } from './game.keys';

export const gameConfigQueryOptions = (stageId: string) => ({
  queryKey: gameKeys.config(stageId),
  queryFn: () => gameApi.getConfig(stageId),
  staleTime: Infinity,
  gcTime: Infinity,
});
