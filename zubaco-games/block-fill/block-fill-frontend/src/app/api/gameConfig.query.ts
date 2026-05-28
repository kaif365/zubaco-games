import { appEnv } from '@/app/config/env';
import { fetchGameConfigs } from '@/app/api/gameApi';

export const gameConfigKeys = {
  all: ['gameConfig'] as const,
  byStage: (stageId: string) => [...gameConfigKeys.all, stageId] as const,
};

export const gameConfigQueryOptions = (stageId: string = appEnv.userStageId ?? '') => ({
  queryKey: gameConfigKeys.byStage(stageId),
  queryFn: () => fetchGameConfigs(stageId),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
