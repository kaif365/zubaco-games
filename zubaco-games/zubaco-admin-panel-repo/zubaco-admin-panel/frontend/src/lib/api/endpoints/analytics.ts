import { get } from "@/lib/api/http";

export interface OverviewStats {
  dau: number;
  mau: number;
  revenue_mtd: number;
  retention_d7: number;
  total_users: number;
  total_games_played: number;
}

export interface UserGrowthItem {
  date: string;
  registrations: number;
  active_users: number;
}

export interface RevenueItem {
  date: string;
  deposits: number;
  withdrawals: number;
  net: number;
}

export interface GamePopularityItem {
  game_type: string;
  play_count: number;
  avg_score: number;
}

export async function fetchAnalyticsOverview(): Promise<OverviewStats | null> {
  return get<OverviewStats>("/admin/analytics/overview");
}

export async function fetchUserGrowth(days = 30): Promise<UserGrowthItem[] | null> {
  return get<UserGrowthItem[]>("/admin/analytics/user-growth", {
    query: { days },
  });
}

export async function fetchRevenue(days = 30): Promise<RevenueItem[] | null> {
  return get<RevenueItem[]>("/admin/analytics/revenue", {
    query: { days },
  });
}

export async function fetchGamePopularity(): Promise<GamePopularityItem[] | null> {
  return get<GamePopularityItem[]>("/admin/analytics/game-popularity");
}
