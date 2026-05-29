import type { StageContentData } from '@/types/stage-content-api.types';
import { get } from '@services/httpClient';

export const stageContentApi = {
  getStageContent: (
    adminBaseUrl: string,
    stageId: string,
    lang: string,
  ): Promise<StageContentData> =>
    get<StageContentData>('/admin/games/stage-content', {
      baseURL: adminBaseUrl,
      params: { stage_id: stageId, game_type: 'SLIDING_PUZZLE', lang },
    }),
};
