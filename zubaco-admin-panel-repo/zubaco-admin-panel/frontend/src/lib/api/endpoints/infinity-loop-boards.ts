import { del, get, post } from "@/lib/api/http";
import { getGameApiBaseUrl, resolveGameToken } from "@/config/game-registry";

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

export interface InfinityBoardDto {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  gridSize?: { x: number; y: number };
  grid?: number[][];
  timeLimit?: number;
  color?: string;
  createdAt?: string;
  level?: { id: string; name: string };
}

export interface CreateInfinityBoardRequest {
  levelId: string;
  name: string;
  gridX: number;
  gridY: number;
  grid: number[][];
  color?: string;
}

export async function fetchInfinityBoards(
  params: { levelId?: string; skip?: number; limit?: number; search?: string },
  token?: string,
  gameName = "Infinity Loop",
): Promise<{ data: InfinityBoardDto[]; totalCount: number }> {
  const payload = await get<
    ApiEnvelope<{
      items?: InfinityBoardDto[];
      data?: InfinityBoardDto[];
      totalCount?: number;
      total?: number;
    }>
  >("/v1/boards", {
    token: resolveGameToken(gameName, token),
    baseUrl: getGameApiBaseUrl(gameName),
    query: {
      ...(params.levelId ? { levelId: params.levelId } : {}),
      skip: params.skip ?? 0,
      limit: params.limit ?? 100,
      ...(params.search ? { search: params.search } : {}),
    },
  });

  const raw = payload?.data ?? {};
  const items = raw.items ?? raw.data ?? [];
  const totalCount = raw.totalCount ?? raw.total ?? items.length ?? 0;

  // Normalize gridX/gridY from gridSize when needed.
  const normalized = items.map((board) => {
    const x = board.gridX ?? board.gridSize?.x;
    const y = board.gridY ?? board.gridSize?.y;
    return {
      ...board,
      gridX: x ?? 0,
      gridY: y ?? 0,
    };
  });

  return { data: normalized, totalCount };
}

export async function createInfinityBoard(
  payload: CreateInfinityBoardRequest,
  token?: string,
  gameName = "Infinity Loop",
): Promise<InfinityBoardDto | null> {
  const response = await post<ApiEnvelope<InfinityBoardDto>>(
    "/v1/boards",
    payload,
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
    },
  );
  return response?.data ?? null;
}

export async function deleteInfinityBoards(
  ids: string[],
  token?: string,
  gameName = "Infinity Loop",
): Promise<boolean> {
  const response = await del<ApiEnvelope<{ count?: number }>>(
    "/v1/boards",
    { ids },
    {
      token: resolveGameToken(gameName, token),
      baseUrl: getGameApiBaseUrl(gameName),
    },
  );
  return response?.success ?? false;
}
