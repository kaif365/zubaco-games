import { del, get, post, put } from "@/lib/api/http";
import {
  getGameApiBaseUrl,
  resolveGameToken,
} from "@/config/game-registry";
import type {
  CreateMemoryCardMatchingLevelPayload,
  MemoryCardMatchingLevel,
  MemoryCardMatchingLevelsParams,
  UpdateMemoryCardMatchingLevelPayload,
  MemoryCardMatchingStageConfig,
  UpsertMemoryCardMatchingStageConfigPayload,
} from "@/types/games/memory-card-matching";

interface ApiEnvelope<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

interface LevelsData {
  data?: MemoryCardMatchingLevel[];
  items?: MemoryCardMatchingLevel[];
  totalCount?: number;
  total?: number;
}

type FileUploadData =
  | string
  | {
      key?: string;
      assetKey?: string;
      path?: string;
      url?: string;
      file?: { key?: string; assetKey?: string; path?: string; url?: string };
    };

function extractAssetKey(data: FileUploadData | null | undefined): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (!data || typeof data !== "object") {
    throw new Error("Upload response did not include an asset key.");
  }

  const direct = data.assetKey ?? data.key ?? data.path ?? data.url;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const nested =
    data.file?.assetKey ?? data.file?.key ?? data.file?.path ?? data.file?.url;
  if (typeof nested === "string" && nested.trim()) return nested.trim();

  throw new Error("Upload response did not include an asset key.");
}

/** Parses multi-file upload `data`; supports arrays or common `{ items | files | data }` wrappers. */
function extractAssetKeys(
  payload: unknown,
  expectedCount: number,
): string[] {
  if (expectedCount === 0) return [];

  let list: unknown;
  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    list =
      obj.items ??
      obj.files ??
      obj.data ??
      (expectedCount === 1 ? payload : undefined);
  } else if (payload != null && expectedCount === 1) {
    list = [payload];
  }

  if (!Array.isArray(list)) {
    throw new Error("Upload response was not an array of asset keys.");
  }

  const keys = list.map((item) => extractAssetKey(item as FileUploadData));
  if (keys.length !== expectedCount) {
    throw new Error(
      `Upload returned ${keys.length} asset key(s); expected ${expectedCount}.`,
    );
  }
  return keys;
}

export async function fetchMemoryCardMatchingLevels(
  gameName: string,
  params: MemoryCardMatchingLevelsParams = {},
  token?: string,
): Promise<{ data: MemoryCardMatchingLevel[]; totalCount: number }> {
  const payload = await get<ApiEnvelope<LevelsData>>("/v1/levels", {
    baseUrl: getGameApiBaseUrl(gameName),
    token: resolveGameToken(gameName, token),
    query: {
      ...params,
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
    },
  });

  const rawList = payload?.data?.data ?? payload?.data?.items ?? [];
  const data = rawList.map((item) => {
    const row = item as MemoryCardMatchingLevel & { levelId?: string };
    return {
      ...row,
      id: row.id || row.levelId || "",
    };
  });
  return {
    data,
    totalCount: payload?.data?.totalCount ?? payload?.data?.total ?? data.length,
  };
}

export async function fetchMemoryCardMatchingLevelDetails(
  gameName: string,
  levelId: string,
  token?: string,
): Promise<MemoryCardMatchingLevel | null> {
  const response = await get<ApiEnvelope<MemoryCardMatchingLevel>>(
    "/v1/levels/details",
    {
      baseUrl: getGameApiBaseUrl(gameName),
      token: resolveGameToken(gameName, token),
      query: { levelId },
    },
  );

  return response?.data ?? null;
}

export async function createMemoryCardMatchingLevel(
  gameName: string,
  payload: CreateMemoryCardMatchingLevelPayload,
  token?: string,
): Promise<MemoryCardMatchingLevel | null> {
  const response = await post<
    ApiEnvelope<MemoryCardMatchingLevel>,
    CreateMemoryCardMatchingLevelPayload
  >("/v1/levels", payload, {
    baseUrl: getGameApiBaseUrl(gameName),
    token: resolveGameToken(gameName, token),
  });

  return response?.data ?? null;
}

export async function updateMemoryCardMatchingLevel(
  gameName: string,
  payload: UpdateMemoryCardMatchingLevelPayload,
  token?: string,
): Promise<MemoryCardMatchingLevel | null> {
  const response = await put<
    ApiEnvelope<MemoryCardMatchingLevel>,
    UpdateMemoryCardMatchingLevelPayload
  >("/v1/levels", payload, {
    baseUrl: getGameApiBaseUrl(gameName),
    token: resolveGameToken(gameName, token),
  });

  return response?.data ?? null;
}

/** Uploads multiple files in one request (`files` repeated; matches multipart array field). */
export async function uploadMemoryCardMatchingFiles(
  gameName: string,
  files: File[],
  token?: string,
): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await post<ApiEnvelope<unknown>, FormData>(
    "/v1/files/upload",
    formData,
    {
      baseUrl: getGameApiBaseUrl(gameName),
      token: resolveGameToken(gameName, token),
    },
  );

  return extractAssetKeys(response?.data, files.length);
}

export async function deleteMemoryCardMatchingLevels(
  gameName: string,
  ids: string[],
  token?: string,
): Promise<boolean> {
  const response = await del<
    ApiEnvelope<{ count: number }>,
    { levelIds: string[] }
  >(
    "/v1/levels",
    { levelIds: ids },
    {
      baseUrl: getGameApiBaseUrl(gameName),
      token: resolveGameToken(gameName, token),
    },
  );

  return response?.success ?? false;
}

export async function fetchMemoryCardMatchingStageConfig(
  gameName: string,
  stageId: string,
  token?: string,
): Promise<MemoryCardMatchingStageConfig | null> {
  const payload = await get<
    ApiEnvelope<{ data: MemoryCardMatchingStageConfig[]; totalCount: number }>
  >("/v1/stage-configs", {
    baseUrl: getGameApiBaseUrl(gameName),
    token: resolveGameToken(gameName, token),
    query: {
      stageId,
      limit: 1,
      skip: 0,
    },
  });

  return payload?.data?.data?.[0] ?? null;
}

export async function upsertMemoryCardMatchingStageConfig(
  gameName: string,
  payload: UpsertMemoryCardMatchingStageConfigPayload,
  token?: string,
): Promise<MemoryCardMatchingStageConfig | null> {
  const response = await put<
    ApiEnvelope<MemoryCardMatchingStageConfig>,
    UpsertMemoryCardMatchingStageConfigPayload
  >("/v1/stage-configs", payload, {
    baseUrl: getGameApiBaseUrl(gameName),
    token: resolveGameToken(gameName, token),
  });

  return response?.data ?? null;
}
