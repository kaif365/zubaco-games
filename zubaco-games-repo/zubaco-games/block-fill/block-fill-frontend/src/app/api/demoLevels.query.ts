import { appEnv } from '@/app/config/env';
import { fetchDemoLevels } from '@/app/api/gameApi';

export const demoLevelsKeys = {
  all: ['demoLevels'] as const,
  byStage: (stageId: string) => [...demoLevelsKeys.all, stageId] as const,
};

export const demoLevelsQueryOptions = (stageId: string = appEnv.userStageId ?? '') => ({
  queryKey: demoLevelsKeys.byStage(stageId),
  queryFn: () => fetchDemoLevels(stageId),
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
});
