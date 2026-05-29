import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchDashboardStats, fetchRecentActivity } from "@/services/dashboard";

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD.STATS,
    queryFn: fetchDashboardStats,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD.ACTIVITY,
    queryFn: fetchRecentActivity,
  });
}
