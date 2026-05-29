import type { FlaggedUser, FlagStatus } from "@/types/flagged";
import type {
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from "@/types/common";
import { MOCK_FLAGGED } from "@/mocks/flagged";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const store = [...MOCK_FLAGGED];

export async function fetchFlaggedUsers(
  params: PaginationParams & FilterParams,
): Promise<PaginatedResponse<FlaggedUser>> {
  // TODO: Replace with real API call when available
  await delay(400);

  let results = [...store];

  if (params.search) {
    const q = params.search.toLowerCase();
    results = results.filter(
      (f) =>
        f.userName.toLowerCase().includes(q) ||
        f.gameName.toLowerCase().includes(q) ||
        f.userEmail.toLowerCase().includes(q),
    );
  }

  if (params.status) {
    results = results.filter((f) => f.status === params.status);
  }

  const total = results.length;
  const start = (params.page - 1) * params.pageSize;
  const data = results.slice(start, start + params.pageSize);

  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export async function updateFlaggedStatus(
  id: string,
  status: FlagStatus,
): Promise<FlaggedUser> {
  // TODO: Replace with real API call when available
  await delay(300);
  const index = store.findIndex((f) => f.id === id);
  if (index === -1) throw new Error("Flagged record not found");
  store[index] = { ...store[index], status };
  return store[index];
}

export async function fetchFlaggedById(
  id: string,
): Promise<FlaggedUser | null> {
  // TODO: Replace with real API call when available
  await delay(200);
  return store.find((f) => f.id === id) ?? null;
}
