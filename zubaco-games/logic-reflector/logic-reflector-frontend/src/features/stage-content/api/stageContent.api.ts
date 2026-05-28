import axios from 'axios';

import type { StageContentData } from '@/types/stage-content-api.types';

export const stageContentApi = {
  getStageContent: async (
    adminBaseUrl: string,
    stageId: string,
    lang: string,
  ): Promise<StageContentData> => {
    const res = await axios.get<StageContentData>(
      `${adminBaseUrl}/admin/games/stage-content`,
      { params: { stage_id: stageId, game_type: 'LOGIC_REFLECTOR', lang } },
    );
    return res.data;
  },
};
