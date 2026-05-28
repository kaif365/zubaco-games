const imageCache = new Set<string>();

/**
 * Mark cached.
 *
 * @param {string} src - The src.
 *
 * @returns {void} No return value.
 */
function markCached(src: string) {
  if (src) imageCache.add(src);
}

/**
 * Preload images.
 *
 * @param {readonly string[]} sources - The sources.
 *
 * @returns {void} No return value.
 */
export function preloadImages(sources: readonly string[]) {
  for (const src of sources) {
    if (!src || imageCache.has(src)) continue;
    const img = new Image();
    img.src = src;
    if (img.complete) {
      markCached(src);
      continue;
    }
    img.onload = () => {
      markCached(src);
    };
    img.onerror = () => {
      markCached(src);
    };
  }
}
