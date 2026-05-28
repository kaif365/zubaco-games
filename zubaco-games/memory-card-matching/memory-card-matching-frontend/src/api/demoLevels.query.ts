import { gameApi } from '@/api/gameApi';
import { QUERY_KEYS } from '@/constants/game.constants';

export const demoLevelsQueryOptions = () => ({
  queryKey: QUERY_KEYS.demoLevels,
  queryFn: () => gameApi.getDemoLevels(),
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
});
