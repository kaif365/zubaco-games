import { get } from "@/lib/api/http";

// Shapes below mirror the authoritative backend AnalyticsService
// (zubaco-admin-panel/backend/src/analytics/analytics.service.ts).

export interface OverviewStats {
  total_users: number;
  dau: number;
  mau: number;
  total_revenue: number;
  month_revenue: number;
  active_seasons: number;
  total_sessions: number;
  today_sessions: number;
}

export interface UserGrowthItem {
  date: string;
  signups: number;
}

export interface RetentionStats {
  d7_retention: number;
  d30_retention: number;
  d7_cohort_size: number;
  d30_cohort_size: number;
}

export interface RevenueItem {
  date: string;
  deposits: number;
  entry_fees: number;
  total: number;
}

export interface GamePopularityItem {
  game_type: string;
  total_plays: number;
  avg_score: number;
}

export interface GameCompletionItem {
  game_type: string;
  total: number;
  completed: number;
  completion_rate: number;
}

export async function fetchAnalyticsOverview(): Promise<OverviewStats | null> {
  return get<OverviewStats>("/admin/analytics/overview");
}

export async function fetchUserGrowth(days = 30): Promise<UserGrowthItem[] | null> {
  return get<UserGrowthItem[]>("/admin/analytics/users/growth", {
    query: { days },
  });
}

export async function fetchRetention(): Promise<RetentionStats | null> {
  return get<RetentionStats>("/admin/analytics/users/retention");
}

export async function fetchRevenue(days = 30): Promise<RevenueItem[] | null> {
  return get<RevenueItem[]>("/admin/analytics/revenue", {
    query: { days },
  });
}

export async function fetchGamePopularity(): Promise<GamePopularityItem[] | null> {
  return get<GamePopularityItem[]>("/admin/analytics/games/popularity");
}

export async function fetchGameCompletion(): Promise<GameCompletionItem[] | null> {
  return get<GameCompletionItem[]>("/admin/analytics/games/completion");
}
