import { get, del, post, put } from "@/lib/api/http";
import type {
  Tournament,
  TournamentsResponse,
  TournamentDeleteResponse,
  TournamentDetailResponse,
  TournamentStagesUpdateResponse,
} from "@/types/tournament";
import type { PaginationParams, FilterParams } from "@/types/common";

export interface FetchTournamentsParams extends PaginationParams, FilterParams {
  token?: string;
}

export interface CreateTournamentPayload {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  stageIds: string[];
}

export interface AddStagesPayload {
  tournament_id: string;
  stage_ids: string[];
}

export interface DeleteTournamentsPayload {
  tournamentIds: string[];
}

export interface UpdateTournamentPayload {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  stageIds?: string[];
}

function normalizeTournamentData(
  tournament: Tournament | null | undefined,
): Tournament | null {
  if (!tournament) return null;
  return {
    ...tournament,
    start_date: tournament.start_date ?? tournament.startDate ?? null,
    end_date: tournament.end_date ?? tournament.endDate ?? null,
    stages_count: tournament.stages_count ?? tournament.stagesCount ?? null,
    games_count: tournament.games_count ?? tournament.gamesCount ?? null,
    unique_user_count:
      tournament.unique_user_count ?? tournament.uniqueUserCount ?? null,
    startDate: tournament.startDate ?? tournament.start_date ?? null,
    endDate: tournament.endDate ?? tournament.end_date ?? null,
    stagesCount: tournament.stagesCount ?? tournament.stages_count ?? null,
    gamesCount: tournament.gamesCount ?? tournament.games_count ?? null,
    uniqueUserCount:
      tournament.uniqueUserCount ?? tournament.unique_user_count ?? null,
    stages: Array.isArray(tournament.stages) ? tournament.stages : [],
  };
}

export async function fetchTournaments(
  params: FetchTournamentsParams,
): Promise<TournamentsResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.pageSize,
  };

  if (params.search?.trim()) {
    query.search = params.search.trim();
  }

  const response = await get<TournamentsResponse>("/admin/tournaments/", {
    token: params.token,
    query,
  });

  if (!response) {
    throw new Error("Failed to fetch tournaments");
  }

  response.data.items = (response.data.items ?? [])
    .map((item) => normalizeTournamentData(item))
    .filter((item): item is Tournament => Boolean(item));

  return response;
}

export async function deleteTournament(
  id: string,
  token?: string,
): Promise<TournamentDeleteResponse> {
  return deleteTournaments({ tournamentIds: [id] }, token);
}

export async function deleteTournaments(
  payload: DeleteTournamentsPayload,
  token?: string,
): Promise<TournamentDeleteResponse> {
  const response = await del<TournamentDeleteResponse>(
    "/admin/tournaments",
    payload,
    { token },
  );

  if (!response) {
    throw new Error("Failed to delete tournament");
  }

  return response;
}

export async function fetchTournamentById(
  id: string,
  token?: string,
): Promise<TournamentDetailResponse> {
  const response = await get<TournamentDetailResponse>(
    `/admin/tournaments/${id}`,
    {
      token,
    },
  );

  if (!response) {
    throw new Error("Failed to fetch tournament details");
  }

  response.data = normalizeTournamentData(response.data);

  return response;
}

export async function fetchTournamentAssignedStageIds(
  tournamentId: string,
  token?: string,
): Promise<string[]> {
  const response = await fetchTournamentById(tournamentId, token);
  return (response?.data?.stages ?? [])
    .map((s) => s.id)
    .filter((id): id is string => typeof id === "string" && !!id);
}

export async function createTournament(
  payload: CreateTournamentPayload,
  token?: string,
): Promise<TournamentDetailResponse> {
  const response = await post<TournamentDetailResponse>(
    "/admin/tournaments",
    payload,
    {
      token,
    },
  );

  if (!response) {
    throw new Error("Failed to create tournament");
  }

  response.data = normalizeTournamentData(response.data);

  return response;
}

export async function addStagesToTournament(
  payload: AddStagesPayload,
  token?: string,
): Promise<TournamentStagesUpdateResponse> {
  const response = await post<TournamentStagesUpdateResponse>(
    "/admin/tournaments/stages",
    payload,
    {
      token,
    },
  );

  if (!response) {
    throw new Error("Failed to add stages to tournament");
  }

  return response;
}

export async function updateTournament(
  tournamentId: string,
  payload: UpdateTournamentPayload,
  token?: string,
): Promise<TournamentDetailResponse> {
  const response = await put<TournamentDetailResponse>(
    `/admin/tournaments/${tournamentId}`,
    payload,
    {
      token,
    },
  );

  if (!response) {
    throw new Error("Failed to update tournament");
  }

  response.data = normalizeTournamentData(response.data);

  return response;
}

export async function removeStagesFromTournament(
  tournamentId: string,
  stageIds: string | string[],
  token?: string,
): Promise<TournamentStagesUpdateResponse> {
  const ids = Array.isArray(stageIds) ? stageIds.join(",") : stageIds;
  const response = await del<TournamentStagesUpdateResponse>(
    `/admin/tournaments/${tournamentId}/stages/${ids}`,
    undefined,
    {
      token,
    },
  );

  if (!response) {
    throw new Error("Failed to remove stages from tournament");
  }

  return response;
}
