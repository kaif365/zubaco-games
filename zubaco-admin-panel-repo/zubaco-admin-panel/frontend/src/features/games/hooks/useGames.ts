import { useGamesQuery } from "@/lib/react-query/games";

interface UseGamesParams {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  enabled?: boolean;
}

export function useGames({
  page,
  pageSize,
  search,
  status,
  enabled,
}: UseGamesParams) {
  return useGamesQuery(
    {
      page,
      pageSize,
      search,
      status: status === "all" ? undefined : status,
    },
    { enabled },
  );
}
