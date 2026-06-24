import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { fetchUsers } from "@/services/users";

interface UseUsersParams {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}

export function useUsers({ page, pageSize, search, status }: UseUsersParams) {
  const params = { page, pageSize, search, status: status === "all" ? undefined : status };

  return useQuery({
    queryKey: QUERY_KEYS.USERS.LIST(params),
    queryFn: () => fetchUsers({ page, pageSize, search, status: status === "all" ? undefined : status }),
    placeholderData: (prev) => prev,
  });
}
