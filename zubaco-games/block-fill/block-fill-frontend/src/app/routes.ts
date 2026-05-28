export const HOME_ROUTE = '/';
export const GENERATOR_ROUTE = '/generator';
export const GAME_ROUTE = '/game';
export const SETTINGS_ROUTE = '/settings';
export const STATS_ROUTE = '/stats';

export type AppRoute = typeof HOME_ROUTE | typeof GENERATOR_ROUTE | typeof GAME_ROUTE | typeof SETTINGS_ROUTE | typeof STATS_ROUTE;

/**
 * Maps pathname and hash to the active SPA route (hash wins when present).
 *
 * @param {string} pathname - `window.location.pathname`.
 * @param {string} [hash=''] - `window.location.hash` (optional leading `#` is stripped).
 *
 * @returns {AppRoute} The resolved route constant.
 */
export function getCurrentRoute(pathname: string, hash = ''): AppRoute {
  const normalizedHash = hash.replace(/^#/, '');
  const candidate = normalizedHash || pathname;

  if (candidate.startsWith(GENERATOR_ROUTE)) {
    return GENERATOR_ROUTE;
  }

  if (candidate.startsWith(GAME_ROUTE)) {
    return GAME_ROUTE;
  }

  if (candidate.startsWith(SETTINGS_ROUTE)) {
    return SETTINGS_ROUTE;
  }

  if (candidate.startsWith(STATS_ROUTE)) {
    return STATS_ROUTE;
  }

  return HOME_ROUTE;
}

/**
 * Builds the hash fragment used in the address bar for a given route.
 *
 * @param {AppRoute} route - Target route.
 *
 * @returns {string} Hash string (`#/` or `#/game`, etc.).
 */
export function toRouteHash(route: AppRoute) {
  return route === HOME_ROUTE ? '#/' : `#${route}`;
}
