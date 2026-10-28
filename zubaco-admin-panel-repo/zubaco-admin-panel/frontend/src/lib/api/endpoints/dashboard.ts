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
  const res = await get<any>("/admin/analytics/overview");
  const data: OverviewResponse | null = res?.data ?? res ?? null;
  if (!data) {
    return {
      totalGames: 0,
      totalUsers: 0,
      activeUsers: 0,
      flaggedUsers: 0,
      gamesGrowth: 0,
      usersGrowth: 0,
      activeUsersGrowth: 0,
      flaggedGrowth: 0,
    };
  }
  return {
    totalGames: data.total_sessions ?? 0,
    totalUsers: data.total_users ?? 0,
    activeUsers: data.dau ?? 0,
    flaggedUsers: 0, // fetched separately if needed
    gamesGrowth: data.today_sessions ?? 0,
    usersGrowth: data.mau ?? 0,
    activeUsersGrowth: data.dau ?? 0,
    flaggedGrowth: 0,
  };
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  // Activity feed from recent user signups
  const res = await get<any>("/admin/analytics/users/growth", {
    query: { days: 7 },
  });
  const payload = res?.data ?? res;
  const growth = Array.isArray(payload) ? payload : [];
  if (growth.length === 0) return [];

  return growth.slice(-5).reverse().map((item: any, i: number) => ({
    id: `activity-${i}`,
    type: "user_joined" as const,
    title: `${item.signups} new users`,
    description: `${item.signups} users signed up on ${item.date}`,
    timestamp: new Date(item.date).toISOString(),
  }));
}
