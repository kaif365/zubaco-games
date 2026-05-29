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

export async function fetchSeasons(): Promise<Season[] | null> {
  return get<Season[]>("/admin/seasons");
}

export async function createSeason(payload: CreateSeasonPayload): Promise<Season | null> {
  return post<Season, CreateSeasonPayload>("/admin/seasons", payload);
}

export async function updateSeason(id: string, payload: Partial<CreateSeasonPayload>): Promise<Season | null> {
  return patch<Season, Partial<CreateSeasonPayload>>(`/admin/seasons/${id}`, payload);
}

export async function deleteSeason(id: string): Promise<unknown> {
  return del(`/admin/seasons/${id}`);
}

export async function openSeason(id: string): Promise<Season | null> {
  return post<Season>(`/admin/seasons/${id}/open`);
}

export async function closeSeason(id: string): Promise<Season | null> {
  return post<Season>(`/admin/seasons/${id}/close`);
}
