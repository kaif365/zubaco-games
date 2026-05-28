import { logger } from "@/lib/default-logger";
import URL from "@/services/endpoints";
import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  httpPut,
} from "@/services/fetcher";
import { handleServerError } from "@/services/service-error-handler";
import { UserDemoResponse } from "@/types/user-demo";

export interface GameLevelDto {
  id: string;
  stage: number;
  name: string;
  tiles: string[][];
}

export interface SaveGameLevelPayload {
  stage: number;
  name: string;
  tiles: string[][];
}

const getUserDemo = async (): Promise<UserDemoResponse> => {
  try {
    const response: UserDemoResponse = await httpGet(URL.USER_DEMO);
    return response;
  } catch (error) {
    logger.error("Failed to fetch user demo:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const getLevels = async (): Promise<GameLevelDto[]> => {
  try {
    const response = await httpGet<GameLevelDto[]>(URL.GAME_LEVELS);
    return response;
  } catch (error) {
    logger.error("Failed to fetch game levels:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const getLevelById = async (id: string): Promise<GameLevelDto> => {
  try {
    const response = await httpGet<GameLevelDto>(URL.GAME_LEVEL_BY_ID(id));
    return response;
  } catch (error) {
    logger.error("Failed to fetch game level:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const createLevel = async (
  payload: SaveGameLevelPayload,
): Promise<GameLevelDto> => {
  try {
    const response = await httpPost<GameLevelDto, SaveGameLevelPayload>(
      URL.GAME_LEVELS,
      payload,
    );
    return response;
  } catch (error) {
    logger.error("Failed to create game level:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const updateLevel = async (
  id: string,
  payload: SaveGameLevelPayload,
): Promise<GameLevelDto> => {
  try {
    const response = await httpPut<GameLevelDto, SaveGameLevelPayload>(
      URL.GAME_LEVEL_BY_ID(id),
      payload,
    );
    return response;
  } catch (error) {
    logger.error("Failed to update game level:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const patchLevel = async (
  id: string,
  payload: Partial<SaveGameLevelPayload>,
): Promise<GameLevelDto> => {
  try {
    const response = await httpPatch<
      GameLevelDto,
      Partial<SaveGameLevelPayload>
    >(URL.GAME_LEVEL_BY_ID(id), payload);
    return response;
  } catch (error) {
    logger.error("Failed to patch game level:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const deleteLevel = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await httpDelete<{ success: boolean }>(
      URL.GAME_LEVEL_BY_ID(id),
    );
    return response;
  } catch (error) {
    logger.error("Failed to delete game level:", error);
    const { errors, message } = handleServerError(error);
    throw errors ?? message;
  }
};

const gameServices = {
  getUserDemo,
  getLevels,
  getLevelById,
  createLevel,
  updateLevel,
  patchLevel,
  deleteLevel,
};

export default gameServices;
