import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { stageContentApi } from '@/features/sequence-recall/api/stageContent.api';
import { stageContentKeys } from '@/features/sequence-recall/api/stageContent.keys';
import { getApiErrorMessage, isApiErrorCode } from '@/lib/api/getApiErrorMessage';
import type { StageContentData, StageContentPage } from '@/types/stage-content-api.types';
import { appConfig } from '@app/config/appConfig';
import { useApiError } from '@hooks/useApiError';
import type {
  InstructionItem,
  InstructionSlide,
  StageContent,
  StageInstructionContentMap,
} from '@micro-screens/src/types/instruction-content';
import type { StageId } from '@micro-screens/src/types/stage-theme';

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mapPage(page: StageContentPage): InstructionSlide {
  const variant = page.point_type === 'ORDERED' ? ('step' as const) : ('rule' as const);
  const items: InstructionItem[] = page.points.map((point) => ({
    id: slugify(point.title),
    title: point.title,
    description: point.description,
    variant,
  }));
  return {
    id: slugify(page.title),
    title: page.title,
    description: page.description,
    items,
  };
}

function mapToStageContent(data: StageContentData): Partial<StageContent> | null {
  const section = data.content_section;
  if (!section) return null;
  const slides = section.content.pages
    .filter((p) => p.visible_in_app !== false)
    .map(mapPage);
  if (slides.length === 0) return null;
  return {
    ...(section.content.game_title ? { gameTitle: section.content.game_title } : {}),
    slides,
  };
}

function buildContentByStage(
  stageNumber: StageId,
  content: Partial<StageContent>,
): Partial<StageInstructionContentMap> {
  const result: Partial<StageInstructionContentMap> = {};
  result[stageNumber] = content as StageContent;
  return result;
}

interface UseStageContentOptions {
  enabled?: boolean;
}

export interface UseStageContentResult {
  contentByStage: Partial<StageInstructionContentMap> | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useStageContent({ enabled = true }: UseStageContentOptions = {}): UseStageContentResult {
  const { t, i18n } = useTranslation();
  const { showApiError } = useApiError();
  const stageId = appConfig.socket.stageId;
  const stageNumber = appConfig.socket.stageNumber;
  const adminBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL;
  const lang = i18n.language.toUpperCase() === 'HI' ? 'HI' : 'EN';

  const shouldFetch = Boolean(adminBaseUrl) && enabled;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: stageContentKeys.byStage(stageId, lang),
    queryFn: () => stageContentApi.getStageContent(adminBaseUrl ?? '', stageId, lang),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!shouldFetch || !isError) return;

    const description = isApiErrorCode(error, 'CONTENT_NOT_FOUND')
      ? t('errors.contentNotFound')
      : getApiErrorMessage(error, t('errors.requestFailed'));

    showApiError({
      title: t('errors.contentFailed'),
      description,
    });
  }, [shouldFetch, isError, error, showApiError, t]);

  if (!data) {
    return {
      contentByStage: undefined,
      isLoading: shouldFetch && isLoading,
      isError,
    };
  }

  const mapped = mapToStageContent(data);
  if (!mapped) {
    return { contentByStage: undefined, isLoading: false, isError: false };
  }

  return {
    contentByStage: buildContentByStage(stageNumber, mapped),
    isLoading: false,
    isError: false,
  };
}
