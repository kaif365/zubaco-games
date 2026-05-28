import { useEffect, useState } from 'react';
import { HOME_ROUTE, getCurrentRoute, toRouteHash, type AppRoute } from '@/app/routes';

/**
 * Returns the current route from pathname/hash, or home when `window` is unavailable.
 *
 * @returns {AppRoute} The active route.
 */
function getRoute() {
  if (typeof window === 'undefined') {
    return HOME_ROUTE;
  }

  return getCurrentRoute(window.location.pathname, window.location.hash);
}

/**
 * Subscribes to `popstate` and `hashchange` and exposes imperative navigation.
 *
 * @returns {{ route: AppRoute; navigate: (nextRoute: AppRoute) => void }} Current route and navigate helper.
 */
export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(getRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    if (typeof window === 'undefined' || route === nextRoute) {
      return;
    }

    window.history.pushState({}, '', toRouteHash(nextRoute));
    setRoute(nextRoute);
  };

  return { route, navigate };
}
