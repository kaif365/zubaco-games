import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfigWithDefaults,
} from "@/config/game-config";
import { logger } from "@/lib/default-logger";
import { normalizeLang } from "@/lib/i18n/lang-cookie";
import axiosClient, { resolveAdminBase } from "@/services/axios";
import URL from "@/services/endpoints";
import { handleServerError } from "@/services/service-error-handler";
import type { GameConfig, GameConfigFetchResult } from "@/types/game-config";
import {
  isStageContentEnvelope,
  mapStageContentToInstructionOverride,
} from "@/utils/map-stage-content-api";

interface GameStageContentResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: unknown;
}

const getGameConfig = async (
  stageId: string,
  lang?: string | null,
): Promise<GameConfigFetchResult> => {
  try {
    const gameType = DEFAULT_GAME_CONFIG.settings.gameType;
    const resolvedLang = normalizeLang(lang);

    const response = await axiosClient.get<GameStageContentResponse>(
      URL.ADMIN_GAMES_STAGE_CONTENT,
      {
        baseURL: resolveAdminBase(),
        params: {
          stage_id: stageId,
          game_type: gameType,
          lang: resolvedLang.toUpperCase(),
        },
      },
    );

    const raw = response.data.data;

    if (isStageContentEnvelope(raw)) {
      return {
        gameConfig: mergeGameConfigWithDefaults({}),
        instructionOverride: mapStageContentToInstructionOverride(raw),
      };
    }

    return {
      gameConfig: mergeGameConfigWithDefaults(raw as GameConfig),
      instructionOverride: null,
    };
  } catch (error) {
    logger.error("Failed to fetch game config:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const configServices = {
  getGameConfig,
};

export default configServices;
