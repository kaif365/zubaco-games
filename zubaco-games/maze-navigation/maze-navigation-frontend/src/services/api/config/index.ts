import { STAGE_CONTENT_GAME_TYPE } from "@/constants/stage-content";
import { logger } from "@/lib/default-logger";
import { normalizeLang } from "@/lib/i18n/lang-cookie";
import axiosClient, { resolveAdminBase } from "@/services/axios";
import { handleServerError } from "@/services/service-error-handler";
import URL from "@/services/urls";
import type { StageInstructionContentMap } from "@/types/instruction-content";
import type { StageId } from "@/types/stage-theme";
import {
  isStageContentEnvelope,
  mapStageContentApiToMazeInstructionMap,
} from "@/utils/map-stage-content-api";

interface GameStageContentResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: unknown;
}

const getStageContent = async (
  stageId: string,
  uiStageId: StageId,
  lang?: string | null,
): Promise<Partial<StageInstructionContentMap> | null> => {
  try {
    const resolvedLang = normalizeLang(lang ?? null).toUpperCase();

    const response = await axiosClient.get<GameStageContentResponse>(
      URL.ADMIN_GAMES_STAGE_CONTENT,
      {
        baseURL: resolveAdminBase(),
        params: {
          stage_id: stageId,
          game_type: STAGE_CONTENT_GAME_TYPE,
          lang: resolvedLang,
        },
      },
    );

    const raw = response.data.data;

    if (isStageContentEnvelope(raw)) {
      return mapStageContentApiToMazeInstructionMap(raw, uiStageId);
    }

    return null;
  } catch (error) {
    logger.error("Failed to fetch stage content:", error);
    const { message, errors } = handleServerError(error, true, true);
    throw errors ?? message;
  }
};

const configService = {
  getStageContent,
};

export default configService;
