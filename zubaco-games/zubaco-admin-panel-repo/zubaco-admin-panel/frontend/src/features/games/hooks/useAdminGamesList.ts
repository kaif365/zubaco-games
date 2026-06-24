import { useAdminGamesQuery } from "@/lib/react-query/games";

export function useAdminGamesList(params?: { search?: string }) {
  return useAdminGamesQuery(params);
}
