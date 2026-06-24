import { get, post, put, del } from "@/lib/api/http";
import { getGameApiBaseUrl, resolveGameToken } from "@/config/game-registry";
import { slugifyGameName } from "@/utils/slugify";
import type {
  GameLevel,
  CreateGenericBoardRequest,
  BaseGameBoard,
  SlidingPuzzleBoard,
  SlidingPuzzleBoardDetails,
  CreateSlidingPuzzleBoardRequest,
  UpdateSlidingPuzzleBoardRequest,
  Difficulty,
} from "@/types/pool";
import {
  deriveMazeTemplateName,
  type MazeTemplate,
  type MazeTemplateCreateRequest,
  type MazeTemplateGenerateRequest,
  type MazeTemplateGenerateResponse,
} from "@/types/games/maze";

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

interface PaginationData<T> {
  items?: T[];
  data?: T[];
  total?: number;
  totalCount?: number;
}

type GameLevelsData = PaginationData<GameLevel>;
type MazeTemplateData = PaginationData<MazeTemplate>;

/**
 * Fetch boards for a game using `/v1/boards`.
 */
export async function fetchGameBoards(
  gameId: string,
  params: {
    levelId?: string;
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  token?: string,
  gameName?: string,
): Promise<{ data: unknown[]; totalCount: number }> {
  const payload = await get<
    ApiEnvelope<PaginationData<unknown> | unknown[]>
  >("/v1/boards", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
    query: {
      ...params,
      skip: params.skip ?? 0,
      limit: params.limit ?? 10,
    },
  });

  const responseData = payload?.data;

  if (Array.isArray(responseData)) {
    return {
      data: responseData,
      totalCount: responseData.length,
    };
  }

  const data = responseData?.data ?? responseData?.items ?? [];
  const totalCount =
    responseData?.totalCount ??
    responseData?.total ??
    (Array.isArray(data) ? data.length : 0);

  return { data, totalCount };
}

export async function fetchMazeTemplates(
  params: {
    levelId?: string;
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  token?: string,
  gameName?: string,
): Promise<{ data: MazeTemplate[]; totalCount: number }> {
  const payload = await get<ApiEnvelope<MazeTemplateData | MazeTemplate[]>>(
    "/v1/admin/maze-templates",
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
      query: {
        levelId: params.levelId,
        offset: 0,
        limit: 100,
      },
    },
  );

  const responseData = payload?.data;
  const items = Array.isArray(responseData)
    ? responseData
    : responseData?.items ?? responseData?.data ?? [];

  const normalizedSearch = params.search?.trim().toLowerCase() ?? "";
  const filtered = normalizedSearch
    ? items.filter((item) => {
        const name = deriveMazeTemplateName({
          id: item.id,
          rows: item.rows,
          cols: item.cols,
          level: item.level,
        }).toLowerCase();
        const levelName = item.level?.name?.toLowerCase?.() ?? "";
        return (
          name.includes(normalizedSearch) ||
          levelName.includes(normalizedSearch) ||
          item.id.toLowerCase().includes(normalizedSearch)
        );
      })
    : items;

  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  return {
    data: filtered.slice(skip, skip + limit),
    totalCount: filtered.length,
  };
}

/**
 * Create a board for a game using `/v1/boards`.
 */
export async function createGameBoard<
  TBoard extends BaseGameBoard = BaseGameBoard,
  TPayload = CreateGenericBoardRequest,
>(
  gameId: string,
  payload: TPayload,
  token?: string,
  gameName?: string,
): Promise<TBoard | null> {
  const response = await post<ApiEnvelope<TBoard>>("/v1/boards", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.data ?? null;
}

export async function createMazeTemplate(
  payload: MazeTemplateCreateRequest,
  token?: string,
  gameName?: string,
): Promise<MazeTemplate | null> {
  const response = await post<ApiEnvelope<MazeTemplate>>(
    "/v1/admin/maze-templates",
    payload,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.data ?? null;
}

export async function generateMazeTemplate(
  payload: MazeTemplateGenerateRequest,
  token?: string,
  gameName?: string,
): Promise<MazeTemplateGenerateResponse | null> {
  const response = await post<ApiEnvelope<MazeTemplateGenerateResponse>>(
    "/v1/admin/maze-templates/generate",
    payload,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.data ?? null;
}

/**
 * Delete boards for a game using `/v1/boards`.
 */
export async function deleteGameBoards(
  gameId: string,
  boardIds: string[],
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await del<ApiEnvelope<null>>(
    "/v1/boards",
    { boardIds },
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.success ?? false;
}

export async function deleteMazeTemplate(
  boardId: string,
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await del<ApiEnvelope<null>>(
    `/v1/admin/maze-templates/${boardId}`,
    undefined,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.success ?? false;
}

export async function deleteMazeTemplatesSequentially(
  boardIds: string[],
  token?: string,
  gameName?: string,
): Promise<boolean> {
  for (const boardId of boardIds) {
    const success = await deleteMazeTemplate(boardId, token, gameName);
    if (!success) {
      throw new Error("Failed to delete one or more Maze boards.");
    }
  }
  return true;
}

export async function fetchLevels(
  gameName: string,
  token?: string,
): Promise<GameLevel[]> {
  const endpoint = slugifyGameName(gameName) === "maze-navigation" ? "/v1/admin/levels" : "/v1/levels";
  const payload = await get<ApiEnvelope<GameLevelsData | GameLevel[]>>(endpoint, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName),
  });

  const responseData = payload?.data;
  if (Array.isArray(responseData)) {
    return responseData;
  }
  return (responseData as GameLevelsData)?.items ?? (responseData as GameLevelsData)?.data ?? [];
}

export async function fetchInfinityLevels(
  gameId: string,
  params: {
    name?: string;
    page?: number;
    limit?: number;
  } = {},
  token?: string,
  gameName?: string,
): Promise<{
  data: GameLevel[];
  totalCount: number;
  page: number;
  limit: number;
}> {
  const payload = await get<
    ApiEnvelope<(GameLevelsData & { page?: number; limit?: number }) | GameLevel[]>
  >("/v1/levels", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
    query: {
      ...params,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });

  const responseData = payload?.data;
  const isArray = Array.isArray(responseData);
  const dataObj = responseData as (GameLevelsData & { page?: number; limit?: number }) | undefined;

  return {
    data: isArray ? responseData : (dataObj?.items ?? dataObj?.data ?? []),
    totalCount: isArray ? responseData.length : (dataObj?.total ?? dataObj?.totalCount ?? 0),
    page: !isArray ? (dataObj?.page ?? 1) : 1,
    limit: !isArray ? (dataObj?.limit ?? 20) : 20,
  };
}

export async function createInfinityLevel(
  gameId: string,
  payload: { name: string },
  token?: string,
  gameName?: string,
): Promise<GameLevel | null> {
  const response = await post<ApiEnvelope<GameLevel>>("/v1/levels", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.data ?? null;
}

export async function deleteInfinityLevels(
  gameId: string,
  ids: string[],
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await del<ApiEnvelope<{ count: number }>>(
    "/v1/levels",
    { ids },
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.success ?? false;
}

export async function fetchSlidingPuzzleLevels(
  gameId: string,
  params: {
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  token?: string,
  gameName?: string,
): Promise<{
  data: GameLevel[];
  totalCount: number;
}> {
  const payload = await get<
    ApiEnvelope<GameLevelsData | GameLevel[]>
  >("/v1/levels", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
    query: {
      ...params,
      skip: params.skip ?? 0,
      limit: params.limit ?? 10,
    },
  });

  const responseData = payload?.data;
  const isArray = Array.isArray(responseData);
  const dataObj = responseData as GameLevelsData | undefined;

  return {
    data: isArray ? responseData : (dataObj?.items ?? dataObj?.data ?? []),
    totalCount: isArray ? responseData.length : (dataObj?.total ?? dataObj?.totalCount ?? 0),
  };
}

export async function createSlidingPuzzleLevel(
  gameId: string,
  payload: { name: string },
  token?: string,
  gameName?: string,
): Promise<GameLevel | null> {
  const response = await post<ApiEnvelope<GameLevel>>("/v1/levels", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.data ?? null;
}

export async function updateSlidingPuzzleLevel(
  gameId: string,
  payload: { levelId: string; name: string },
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await put<ApiEnvelope<null>>("/v1/levels", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.success ?? false;
}

export async function deleteSlidingPuzzleLevels(
  gameId: string,
  levelIds: string[],
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await del<ApiEnvelope<{ count: number }>>(
    "/v1/levels",
    { levelIds },
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.success ?? false;
}

export async function fetchSlidingPuzzleBoards(
  gameId: string,
  params: {
    levelId?: string;
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  token?: string,
  gameName?: string,
): Promise<{
  data: SlidingPuzzleBoard[];
  totalCount: number;
}> {
  const payload = await get<
    ApiEnvelope<{ data: SlidingPuzzleBoard[]; totalCount: number }>
  >("/v1/boards", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
    query: {
      ...params,
      skip: params.skip ?? 0,
      limit: params.limit ?? 10,
    },
  });

  return {
    data: payload?.data?.data ?? [],
    totalCount: payload?.data?.totalCount ?? 0,
  };
}

export async function fetchSlidingPuzzleBoardDetails(
  gameId: string,
  boardId: string,
  token?: string,
  gameName?: string,
): Promise<SlidingPuzzleBoardDetails | null> {
  return fetchBoardDetails<SlidingPuzzleBoardDetails>(boardId, gameName || "Sliding Puzzle", token);
}

export async function fetchBoardDetailsByPath<T = unknown>(
  boardId: string,
  gameName: string,
  token?: string,
): Promise<T | null> {
  const payload = await get<ApiEnvelope<T>>(
    `/v1/boards/${boardId}`,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
    },
  );

  return payload?.data ?? null;
}

export async function fetchMazeTemplateDetails(
  boardId: string,
  gameName: string,
  token?: string,
): Promise<MazeTemplate | null> {
  const payload = await get<ApiEnvelope<MazeTemplateData | MazeTemplate[]>>(
    "/v1/admin/maze-templates",
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
      query: { id: boardId, offset: 0, limit: 1 },
    },
  );

  const responseData = payload?.data;
  if (Array.isArray(responseData)) {
    return responseData[0] ?? null;
  }

  return responseData?.items?.[0] ?? responseData?.data?.[0] ?? null;
}

export async function fetchBoardDetails<T = unknown>(
  boardId: string,
  gameName: string,
  token?: string,
): Promise<T | null> {
  const payload = await get<ApiEnvelope<T>>(
    "/v1/boards/details",
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
      query: { boardId },
    },
  );

  return payload?.data ?? null;
}

export async function createSlidingPuzzleBoard(
  gameId: string,
  payload: CreateSlidingPuzzleBoardRequest,
  token?: string,
  gameName?: string,
): Promise<SlidingPuzzleBoard | null> {
  const response = await post<ApiEnvelope<SlidingPuzzleBoard>>(
    "/v1/boards",
    payload,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.data ?? null;
}

export async function updateSlidingPuzzleBoard(
  gameId: string,
  payload: UpdateSlidingPuzzleBoardRequest,
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await put<ApiEnvelope<null>>("/v1/boards", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.success ?? false;
}

export async function deleteSlidingPuzzleBoards(
  gameId: string,
  boardIds: string[],
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await del<ApiEnvelope<null>>(
    "/v1/boards",
    { boardIds },
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName || ""),
    },
  );
  return response?.success ?? false;
}

export async function fetchDifficulties(
  gameName: string,
  params: {
    skip?: number;
    limit?: number;
    search?: string;
  } = {},
  token?: string,
): Promise<{ data: Difficulty[]; totalCount: number }> {
  const payload = await get<
    ApiEnvelope<{ data: Difficulty[]; totalCount: number }>
  >("/v1/difficulties", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName),
    query: {
      ...params,
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
    },
  });

  const responseData = payload?.data;
  const isArray = Array.isArray(responseData);

  if (isArray) {
    return { data: responseData, totalCount: responseData.length };
  }

  return responseData as { data: Difficulty[]; totalCount: number } ?? { data: [], totalCount: 0 };
}

/**
 * Update a board for a game using `/v1/boards` (PUT).
 */
export async function updateGameBoard<
  TPayload = unknown,
>(
  gameId: string,
  payload: TPayload,
  token?: string,
  gameName?: string,
): Promise<boolean> {
  const response = await put<ApiEnvelope<null>>("/v1/boards", payload, {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName || ""),
  });
  return response?.success ?? false;
}
