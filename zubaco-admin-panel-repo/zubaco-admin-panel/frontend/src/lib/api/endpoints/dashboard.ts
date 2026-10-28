import type { DashboardStats, ActivityItem } from "@/types/dashboard";
import { get } from "@/lib/api/http";

interface OverviewResponse {
  total_users: number;
  dau: number;
  mau: number;
  total_revenue: number;
  month_revenue: number;
  active_seasons: number;
  total_sessions: number;
  today_sessions: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const data = await get<OverviewResponse>("/admin/analytics/overview");
  if (!data) {
    return { totalGames: 0, totalUsers: 0, activeUsers: 0, flaggedUsers: 0, gamesGrowth: 0, usersGrowth: 0, activeUsersGrowth: 0, flaggedGrowth: 0 };
  }
  return {
    totalGames: data.total_sessions,
    totalUsers: data.total_users,
    activeUsers: data.dau,
    flaggedUsers: 0, // fetched separately if needed
    gamesGrowth: data.today_sessions,
    usersGrowth: data.mau,
    activeUsersGrowth: data.dau,
    flaggedGrowth: 0,
  };
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  // Activity feed from recent user signups
  const growth = await get<Array<{ date: string; signups: number }>>("/admin/analytics/users/growth", { query: { days: 7 } });
  if (!growth || growth.length === 0) return [];

  return growth.slice(-5).reverse().map((item, i) => ({
    id: `activity-${i}`,
    type: "user_joined" as const,
    title: `${item.signups} new users`,
    description: `${item.signups} users signed up on ${item.date}`,
    timestamp: new Date(item.date).toISOString(),
  }));
}
