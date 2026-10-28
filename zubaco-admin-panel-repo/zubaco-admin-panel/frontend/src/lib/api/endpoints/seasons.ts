import { get, post, patch, del } from "@/lib/api/http";

export interface Season {
  id: string;
  name: string;
  status: "draft" | "open" | "closed" | "completed";
  startDate: string;
  endDate: string;
  totalPlayers?: number;
  prizePool?: number;
  createdAt: string;
}

export interface CreateSeasonPayload {
  name: string;
  startDate: string;
  endDate: string;
  prizePool?: number;
}

function mapBackendSeason(s: any): Season {
  return {
    id: s.id,
    name: s.name,
    status: (s.status ?? "draft").toLowerCase() as Season["status"],
    startDate: s.start_date || s.startDate || "",
    endDate: s.end_date || s.endDate || "",
    totalPlayers: s._count?.entries ?? s.total_players ?? s.totalPlayers ?? 0,
    prizePool: s.prize_pool ? Number(s.prize_pool) : s.prizePool ?? 0,
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
  };
}

export async function fetchSeasons(): Promise<Season[] | null> {
  const res = await get<any>("/admin/seasons");
  if (!res) return null;
  const payload = res?.data ?? res;
  const rawList = Array.isArray(payload?.seasons)
    ? payload.seasons
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  return rawList.map(mapBackendSeason);
}

export async function createSeason(payload: CreateSeasonPayload): Promise<Season | null> {
  const res = await post<any, any>("/admin/seasons", {
    name: payload.name,
    start_date: payload.startDate,
    end_date: payload.endDate,
    prize_pool: payload.prizePool,
  });
  if (!res) return null;
  const data = res?.data ?? res;
  return mapBackendSeason(data);
}

export async function updateSeason(id: string, payload: Partial<CreateSeasonPayload>): Promise<Season | null> {
  const res = await patch<any, any>(`/admin/seasons/${id}`, {
    ...(payload.name && { name: payload.name }),
    ...(payload.startDate && { start_date: payload.startDate }),
    ...(payload.endDate && { end_date: payload.endDate }),
    ...(payload.prizePool !== undefined && { prize_pool: payload.prizePool }),
  });
  if (!res) return null;
  const data = res?.data ?? res;
  return mapBackendSeason(data);
}

export async function deleteSeason(id: string): Promise<unknown> {
  return del(`/admin/seasons/${id}`);
}

export async function openSeason(id: string): Promise<Season | null> {
  const res = await post<any>(`/admin/seasons/${id}/open`);
  if (!res) return null;
  const data = res?.data ?? res;
  return mapBackendSeason(data);
}

export async function closeSeason(id: string): Promise<Season | null> {
  const res = await post<any>(`/admin/seasons/${id}/close`);
  if (!res) return null;
  const data = res?.data ?? res;
  return mapBackendSeason(data);
}
