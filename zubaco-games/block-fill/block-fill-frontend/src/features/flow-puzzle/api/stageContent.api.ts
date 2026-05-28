import type { StageContentData } from '@/types/stage-content-api.types';

export const stageContentApi = {
  getStageContent: async (adminBaseUrl: string, stageId: string, lang: string): Promise<StageContentData> => {
    const url = new URL('/admin/games/stage-content', adminBaseUrl);
    url.searchParams.set('stage_id', stageId);
    url.searchParams.set('game_type', 'BLOCK_FILL');
    url.searchParams.set('lang', lang);
    const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
    const json = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: StageContentData;
    };
    if (!res.ok || json.success === false) {
      throw new Error(
        typeof json.message === 'string' ? json.message : `stage-content: ${String(res.status)}`,
      );
    }
    if (!json.data) {
      throw new Error('Invalid stage content response');
    }
    return json.data;
  },
};
