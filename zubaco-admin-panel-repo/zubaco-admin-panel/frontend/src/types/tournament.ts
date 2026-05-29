import { Stage } from "./stage";

export interface Tournament {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  stages_count?: number | null;
  games_count?: number | null;
  unique_user_count?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  stagesCount?: number | null;
  gamesCount?: number | null;
  uniqueUserCount?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  stages?: Stage[];
}

export interface TournamentsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: Tournament[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export interface TournamentDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Tournament | null;
}

export interface TournamentDetailResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Tournament | null;
}

export interface TournamentStagesUpdateResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    tournament_id: string;
    stages: Stage[];
  };
}
