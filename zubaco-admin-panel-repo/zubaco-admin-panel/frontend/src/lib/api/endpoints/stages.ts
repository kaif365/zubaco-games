import { get, post, del, put } from "@/lib/api/http";
import type { Stage, StagesResponse, StageDetailResponse } from "@/types/stage";
import type {
  PaginationParams,
  FilterParams,
  PaginatedResponse,
} from "@/types/common";

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

export interface FetchStagesParams extends PaginationParams, FilterParams {
  token?: string;
  [key: string]: unknown;
}

export async function fetchStages(
  params: FetchStagesParams,
): Promise<PaginatedResponse<Stage>> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.pageSize,
  };

  if (params.search?.trim()) {
    query.search = params.search.trim();
  }

  const payload = await get<StagesResponse>("/admin/stages", {
    token: params.token,
    query,
  });

  const items = payload?.data?.items ?? [];
  const pagination = payload?.data?.pagination;

  return {
    data: items,
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? params.page,
    pageSize: pagination?.limit ?? params.pageSize,
    totalPages: pagination?.total_pages ?? 1,
  };
}

export async function fetchStageDetail(
  stageId: string,
  params?: PaginationParams & FilterParams & { token?: string },
): Promise<Stage | null> {
  const query: Record<string, string | number> = {};
  if (params?.page) query.page = params.page;
  if (params?.pageSize) query.limit = params.pageSize;
  if (params?.search?.trim()) query.search = params.search.trim();

  const payload = await get<StageDetailResponse>(
    `/admin/stages/${stageId}/games`,
    {
      token: params?.token,
      query,
    },
  );

  return payload?.data ?? null;
}

export async function fetchStageAssignedGameIds(
  stageId: string,
  token?: string,
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<string[]> {
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? 200;

  const ids = new Set<string>();

  let page = 1;
  while (page <= maxPages) {
    const payload = await get<StageDetailResponse>(
      `/admin/stages/${stageId}/games`,
      {
        token,
        query: { page, limit: pageSize },
      },
    );

    const stage = payload?.data ?? null;
    const games = stage?.games ?? [];
    for (const game of games) {
      if (game?.id) ids.add(game.id);
    }

    const totalPages = stage?.pagination?.total_pages ?? 1;
    const hasNext = stage?.pagination?.has_next ?? page < totalPages;
    if (!hasNext) break;

    page += 1;
  }

  return Array.from(ids);
}

export async function addGamesToStage(
  stageId: string,
  gameIds: string | string[],
  token?: string,
): Promise<unknown> {
  const ids = Array.isArray(gameIds) ? gameIds : [gameIds];
  return post<ApiEnvelope<unknown>>(
    "/admin/stages/games",
    { stage_id: stageId, game_ids: ids },
    { token },
  );
}

export async function removeGamesFromStage(
  stageId: string,
  gameIds: string | string[],
  token?: string,
): Promise<unknown> {
  const ids = Array.isArray(gameIds) ? gameIds.join(",") : gameIds;
  return del<ApiEnvelope<unknown>>(`/admin/games/${ids}/stages/${stageId}`, {
    token,
  });
}
export async function createStage(
  data: { stage_number: number; stage_name: string; gameIds: string[] },
  token?: string,
): Promise<ApiEnvelope<Stage> | null> {
  return post<ApiEnvelope<Stage>>("/admin/stages", data, { token });
}

export async function deleteStage(
  stageId: string,
  token?: string,
): Promise<ApiEnvelope<Stage> | null> {
  return del<ApiEnvelope<Stage>>(`/admin/stages/${stageId}`, { token });
}

export async function updateStage(
  stageId: string,
  data: { stage_number: number; stage_name: string; gameIds: string[] },
  token?: string,
): Promise<ApiEnvelope<Stage> | null> {
  return put<ApiEnvelope<Stage>>(`/admin/stages/${stageId}`, data, { token });
}
