import { gameApi } from '@/api/gameApi';
import { QUERY_KEYS } from '@/constants/game.constants';

export const gameConfigQueryOptions = () => ({
  queryKey: QUERY_KEYS.gameConfig,
  queryFn: () => gameApi.getGameConfig(),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
