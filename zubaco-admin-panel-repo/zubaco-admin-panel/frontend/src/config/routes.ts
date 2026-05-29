export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  GAMES: "/games",
  GAMES_DETAIL: (gameId: string) => `/games/${gameId}`,
  STAGES: "/stages",
  STAGES_DETAIL: (id: string) => `/stages/${id}`,
  STAGE_GAME_DETAIL: (stageId: string, gameId: string) =>
    `/stages/${stageId}/game/${gameId}`,
  USERS: "/users",
  USERS_DETAIL: (id: string) => `/users/${id}`,
  FLAGGED: "/flagged",
  TOURNAMENTS: "/tournaments",
  TOURNAMENTS_NEW: "/tournaments/new",
  TOURNAMENTS_DETAIL: (id: string) => `/tournaments/${id}`,
} as const;

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  games: "Games",
  stages: "Stages",
  users: "Users",
  flagged: "Flagged Users",
  tournaments: "Tournaments",
  tournament_detail: "Tournament Detail",
  stage_detail: "Stage Detail",
  game_detail: "Game Detail",
  user_detail: "User Detail",
} as const;
