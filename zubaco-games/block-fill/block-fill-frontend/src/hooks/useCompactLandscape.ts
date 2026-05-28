import { useSyncExternalStore } from 'react';

const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 610px)';

/**
 * Returns whether the compact-landscape media query currently matches.
 *
 * @returns {boolean} True for short landscape viewports.
 */
function getCompactLandscapeMatches(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(COMPACT_LANDSCAPE_QUERY).matches;
}

/**
 * Subscribes to changes on the compact-landscape media query.
 *
 * @param {() => void} onStoreChange - Callback when the match result may have changed.
 *
 * @returns {() => void} Unsubscribe function.
 */
function subscribeCompactLandscape(onStoreChange: () => void) {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQuery = window.matchMedia(COMPACT_LANDSCAPE_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

/**
 * True when the device is in short landscape (typical phone held sideways).
 * Uses `useSyncExternalStore` so `matchMedia` is read and subscribed without effect-driven `setState`.
 *
 * @returns {boolean} Whether the compact-landscape media query matches.
 */
export function useCompactLandscape(): boolean {
  return useSyncExternalStore(subscribeCompactLandscape, getCompactLandscapeMatches, () => false);
}
