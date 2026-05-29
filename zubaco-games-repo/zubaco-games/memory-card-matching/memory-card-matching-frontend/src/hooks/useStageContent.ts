import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { gameApi } from '@/api/gameApi';
import { QUERY_KEYS } from '@/constants/game.constants';
import { useApiError } from '@/hooks/useApiError';
import { getApiErrorMessage, isApiErrorCode } from '@/lib/api/getApiErrorMessage';
import type { StageContentApiLanguage } from '@/types/stage-content-api';
import { buildStageInstructionOverride } from '@/utils/map-stage-content-api';
import type { StageId, StageInstructionContentMap } from '@micro-screens/src';

const normalizeApiLanguage = (lang: string): StageContentApiLanguage => {
  const normalized = lang.trim().toUpperCase();
  return normalized.startsWith('HI') ? 'HI' : 'EN';
};

interface UseStageContentResult {
  contentByStage: Partial<StageInstructionContentMap> | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const useStageContent = (stage?: StageId, enabled = false): UseStageContentResult => {
  const { t, i18n } = useTranslation();
  const { showApiError } = useApiError();
  const language = normalizeApiLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...QUERY_KEYS.stageContent, stage, language],
    queryFn: async () => {
      if (!stage) throw new Error('Missing stage number');
      const apiResponse = await gameApi.getStageContent(language);
      return buildStageInstructionOverride(apiResponse, stage);
    },
    enabled: enabled && Boolean(stage),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!enabled || !stage || !isError) return;

    const description = isApiErrorCode(error, 'CONTENT_NOT_FOUND')
      ? t('errors.contentNotFound')
      : getApiErrorMessage(error, t('errors.requestFailed'));

    showApiError({
      title: t('errors.contentFailed'),
      description,
    });
  }, [enabled, stage, isError, error, showApiError, t]);

  return {
    contentByStage: data ?? undefined,
    isLoading,
    isError,
  };
};
