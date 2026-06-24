import type { DashboardStats, ActivityItem } from "@/types/dashboard";
import { MOCK_DASHBOARD_STATS, MOCK_ACTIVITY } from "@/mocks/dashboard";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // TODO: Replace with real API call when available
  await delay(500);
  return MOCK_DASHBOARD_STATS;
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  // TODO: Replace with real API call when available
  await delay(350);
  return MOCK_ACTIVITY;
}
