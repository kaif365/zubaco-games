import { useEffect, useState } from 'react';

const QUERY = '(orientation: landscape) and (max-height: 610px)';

/**
 * Returns true when the viewport is in landscape orientation with a height
 * below 610 px — used to switch to a compact layout on short landscape screens.
 *
 * @returns {boolean} Whether the compact-landscape breakpoint is currently active.
 */
export function useCompactLandscape(): boolean {
  const [isCompactLandscape, setIsCompactLandscape] = useState(
    () => window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setIsCompactLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isCompactLandscape;
}
