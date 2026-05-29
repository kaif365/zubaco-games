import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, pickAuthToken, pickAuthUser } from "@/services/auth";
import { AUTH_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY } from "@/config/auth";
import { QUERY_KEYS } from "@/config/query-keys";

// Utility to set cookie (keeping it simple for now)
function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const attrs = [
    `Path=/`,
    `SameSite=Lax`,
    secure ? "Secure" : "",
    `Max-Age=${60 * 60 * 24 * 7}`,
  ]
    .filter(Boolean)
    .join("; ");

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${attrs}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const attrs = [`Path=/`, `SameSite=Lax`, secure ? "Secure" : "", "Max-Age=0"]
    .filter(Boolean)
    .join("; ");

  document.cookie = `${encodeURIComponent(name)}=; ${attrs}`;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (payload, { email }) => {
      const token = pickAuthToken(payload);
      if (token) setCookie(AUTH_TOKEN_STORAGE_KEY, token);
      else deleteCookie(AUTH_TOKEN_STORAGE_KEY);

      const authUser = pickAuthUser(payload, email);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));

      // Update auth query state
      queryClient.setQueryData(QUERY_KEYS.AUTH.USER, authUser);
    },
  });
}
