import type { QueryClient } from "@tanstack/react-query";

import { QUERY_ROOT } from "@/constants/react-query-keys";

export function removeSessionScopedQueries(client: QueryClient): void {
  client.removeQueries({ queryKey: [QUERY_ROOT.USER_DEMO] });
  client.removeQueries({ queryKey: [QUERY_ROOT.GAME_CONFIG] });
}

export function invalidateUserDemoQueries(client: QueryClient): void {
  client.invalidateQueries({ queryKey: [QUERY_ROOT.USER_DEMO] });
}
