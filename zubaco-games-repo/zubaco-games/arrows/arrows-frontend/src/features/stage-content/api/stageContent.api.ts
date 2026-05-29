import { get } from "@services/httpClient";

import type { StageContentData } from "@/types/stage-content-api.types";

export const stageContentApi = {
  getStageContent: (
    adminBaseUrl: string,
    stageId: string,
    lang: string,
  ): Promise<StageContentData> =>
    get<StageContentData>("/admin/games/stage-content", {
      baseURL: adminBaseUrl,
      params: { stage_id: stageId, game_type: "ARROWS", lang },
    }),
};
