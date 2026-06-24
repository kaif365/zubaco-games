import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { AUTH_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY } from "@/config/auth";
import { QUERY_KEYS } from "@/config/query-keys";

// Utility to delete cookie
function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const attrs = [`Path=/`, `SameSite=Lax`, secure ? "Secure" : "", "Max-Age=0"]
    .filter(Boolean)
    .join("; ");

  document.cookie = `${encodeURIComponent(name)}=; ${attrs}`;
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      deleteCookie(AUTH_TOKEN_STORAGE_KEY);

      // Clear all queries and auth user state
      queryClient.setQueryData(QUERY_KEYS.AUTH.USER, null);
      queryClient.clear();
    },
  });
}
