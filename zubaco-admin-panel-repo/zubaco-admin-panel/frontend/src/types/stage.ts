export interface StageGame {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StageTournament {
  id: string;
  name: string;
}

export interface Stage {
  id: string;
  stage_number: number;
  stage_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  games?: StageGame[];
  tournaments?: StageTournament[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface StagesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: Stage[];
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

export interface StageDetailResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Stage;
}
