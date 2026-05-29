import { get, put } from '@/lib/api/http';
import {
  getGameApiBaseUrl,
  getGameStageConfigAdapter,
  resolveGameToken,
} from '@/config/game-registry';
import { ApiError } from '@/lib/api/client';
import type { GameConfig } from '@/types/game-config';

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

type ConfigListData<T> = {
  // Older shape
  data?: T[];
  totalCount?: number;
  // Newer shape (matches swagger + Infinity response)
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export async function fetchStageGameConfigByStageId(
  stageId: string,
  gameName: string,
  token?: string,
): Promise<GameConfig | null | undefined> {
  const baseUrl = getGameApiBaseUrl(gameName);
  if (!baseUrl) {
    throw new Error(`API base URL for game "${gameName}" is not configured.`);
  }

  const requestBase = {
    baseUrl,
    token: resolveGameToken(gameName, token),
  } as const;
  const adapter = getGameStageConfigAdapter(gameName);
  const listQuery = adapter?.listQuery?.(stageId) ?? {
    stageId,
    skip: 0,
    limit: 10,
  };

  const isMazeGame = gameName.toLowerCase().includes('maze');
  const endpointPath = isMazeGame
    ? '/v1/admin/stage-configs'
    : '/v1/stage-configs';

  // Some environments expect `skip/limit` while others expect `page/limit`.
  // Try `skip/limit` first, and if the server rejects the params, fallback to `page/limit`.
  let payload: ApiEnvelope<ConfigListData<unknown>> | null;
  try {
    payload = await get<ApiEnvelope<ConfigListData<unknown>>>(endpointPath, {
      ...requestBase,
      query: listQuery,
    });
  } catch (error) {
    if (
      !adapter?.listQuery &&
      error instanceof ApiError &&
      (error.status === 400 || error.status === 422)
    ) {
      payload = await get<ApiEnvelope<ConfigListData<unknown>>>(endpointPath, {
        ...requestBase,
        query: { stageId, page: 1, limit: 10 },
      });
    } else {
      throw error;
    }
  }

  // If we got no payload at all (unexpected), treat as "no response".
  if (!payload) return undefined;

  const listSource = payload?.data;
  const list = Array.isArray(listSource)
    ? listSource
    : (listSource?.items ?? listSource?.data ?? []);
  const raw = list?.find(
    (item) => (item as Record<string, unknown>).stageId === stageId || (item as Record<string, unknown>).stage_id === stageId
  ) ?? list?.[0] ?? null;
  if (!raw) return null;

  const parsed = adapter?.parse ? adapter.parse(raw) : (raw as GameConfig);
  if (!parsed) return null;

  return (
    adapter?.applyDefaults ? adapter.applyDefaults(parsed) : parsed
  ) as GameConfig | null;
}

export async function updateStageGameConfig(
  config: GameConfig,
  gameName: string,
  token?: string,
): Promise<GameConfig | null> {
  const baseUrl = getGameApiBaseUrl(gameName);
  if (!baseUrl) {
    throw new Error(`API base URL for game "${gameName}" is not configured.`);
  }

  const adapter = getGameStageConfigAdapter(gameName);
  const body = adapter?.serialize ? adapter.serialize(config) : config;

  const isMazeGame = gameName.toLowerCase().includes('maze');
  const endpointPath = isMazeGame
    ? '/v1/admin/stage-configs'
    : '/v1/stage-configs';

  const payload = await put<ApiEnvelope<unknown>, unknown>(endpointPath, body, {
    baseUrl,
    token: resolveGameToken(gameName, token),
  });

  const raw = payload?.data ?? null;
  if (!raw) return null;

  const parsed = adapter?.parse ? adapter.parse(raw) : (raw as GameConfig);
  if (!parsed) return null;

  return adapter?.applyDefaults ? adapter.applyDefaults(parsed) : parsed;
}
