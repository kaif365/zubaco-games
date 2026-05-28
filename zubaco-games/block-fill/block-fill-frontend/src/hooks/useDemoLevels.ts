import { useQuery } from '@tanstack/react-query';
import { appEnv } from '@/app/config/env';
import { demoLevelsQueryOptions } from '@/app/api/demoLevels.query';
import { DEMO_LEVELS } from '@/features/flow-puzzle/data/demoLevel';
import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';

const DEMO_FROM_API = true;

interface UseDemoLevelsResult {
  demoLevels: FlowPuzzleLevel[] | undefined;
  isLoading: boolean;
  isEmpty: boolean;
}

export function useDemoLevels(): UseDemoLevelsResult {
  const stageId = appEnv.userStageId ?? '';

  const { data, isLoading, isError } = useQuery({
    ...demoLevelsQueryOptions(stageId),
    enabled: DEMO_FROM_API && !!stageId,
  });

  if (!DEMO_FROM_API) {
    return { demoLevels: DEMO_LEVELS, isLoading: false, isEmpty: false };
  }

  if (isError) {
    return { demoLevels: DEMO_LEVELS, isLoading: false, isEmpty: false };
  }

  if (!isLoading && data && data.length === 0) {
    return { demoLevels: [], isLoading: false, isEmpty: true };
  }

  const resolvedLevels = data && data.length > 0 ? data : DEMO_LEVELS;

  return {
    demoLevels: isLoading ? undefined : resolvedLevels,
    isLoading,
    isEmpty: false,
  };
}
