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
  const res = await get<any>("/admin/analytics/overview");
  return res?.data ?? res ?? null;
}

export async function fetchUserGrowth(days = 30): Promise<UserGrowthItem[] | null> {
  const res = await get<any>("/admin/analytics/users/growth", {
    query: { days },
  });
  return res?.data ?? res ?? null;
}

export async function fetchRetention(): Promise<RetentionStats | null> {
  const res = await get<any>("/admin/analytics/users/retention");
  return res?.data ?? res ?? null;
}

export async function fetchRevenue(days = 30): Promise<RevenueItem[] | null> {
  const res = await get<any>("/admin/analytics/revenue", {
    query: { days },
  });
  return res?.data ?? res ?? null;
}

export async function fetchGamePopularity(): Promise<GamePopularityItem[] | null> {
  const res = await get<any>("/admin/analytics/games/popularity");
  return res?.data ?? res ?? null;
}

export async function fetchGameCompletion(): Promise<GameCompletionItem[] | null> {
  const res = await get<any>("/admin/analytics/games/completion");
  return res?.data ?? res ?? null;
}
