import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";
import { AUTH_STORAGE_KEY } from "@/config/auth";
import type { AuthUser } from "@/types/auth";
import { getSelf } from "@/lib/api/endpoints/auth";
import { pickAuthUser } from "@/services/auth";

export function useUser() {
  return useQuery<AuthUser | null>({
    queryKey: QUERY_KEYS.AUTH.USER,
    queryFn: async () => {
      if (typeof window === "undefined") return null;

      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;

      let storedUser: AuthUser | null = null;
      try {
        storedUser = JSON.parse(stored);
      } catch {
        // ignore
      }

      try {
        // Fetch fresh user data from the backend to verify the token is valid.
        // If the token is invalid/expired, the backend returns 401, which is
        // intercepted by client.ts to perform handleUnauthorized() (logout and redirect).
        const res = await getSelf();
        const freshUser = pickAuthUser(res, storedUser?.email ?? "Admin");
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshUser));
        return freshUser;
      } catch {
        // Fallback to local storage on general network/server errors (e.g. offline)
        // so that the UI remains resilient, but only if the error wasn't an auth failure
        // (which gets handled automatically by the apiRequest interceptor anyway).
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    },
    staleTime: 1000 * 60 * 5, // Stale after 5 minutes
    refetchOnWindowFocus: true, // Automatically refetch on tab focus to check session
  });
}

