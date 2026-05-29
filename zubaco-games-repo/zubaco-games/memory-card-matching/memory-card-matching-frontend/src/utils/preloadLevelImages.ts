import type { LevelData } from '@/models/game.types';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import cardBack from '@micro-screens/assets/cards/card-back.png';
import cardFront from '@micro-screens/assets/cards/card-front.png';

const DEFAULT_PRELOAD_TIMEOUT_MS = 10_000;
const CRITICAL_PRELOAD_TIMEOUT_MS = 20_000;
const CARD_FRAME_URLS = [cardBack, cardFront] as const;

const imagePreloadCache = new Map<string, Promise<void>>();
const linkedPreloadUrls = new Set<string>();

function canPreloadImages(): boolean {
  return typeof Image !== 'undefined';
}

function preloadImageViaLink(url: string): void {
  if (typeof document === 'undefined' || linkedPreloadUrls.has(url)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
  linkedPreloadUrls.add(url);
}

function preloadImage(url: string, timeoutMs = DEFAULT_PRELOAD_TIMEOUT_MS): Promise<void> {
  const cached = imagePreloadCache.get(url);
  if (cached) return cached;

  preloadImageViaLink(url);

  const promise = new Promise<void>((resolve, reject) => {
    if (!canPreloadImages()) {
      resolve();
      return;
    }

    const image = new Image();

    const timeoutId = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(`Timed out preloading image: ${url}`));
    }, timeoutMs);

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      clearTimeout(timeoutId);
    };

    image.onload = () => {
      const decodePromise =
        typeof image.decode === 'function'
          ? image.decode().catch(() => undefined)
          : Promise.resolve();

      void decodePromise.finally(() => {
        cleanup();
        resolve();
      });
    };

    image.onerror = () => {
      cleanup();
      reject(new Error(`Failed to preload image: ${url}`));
    };

    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.loading = 'eager';
    image.src = url;
  });

  imagePreloadCache.set(url, promise);
  void promise.catch(() => imagePreloadCache.delete(url));

  return promise;
}

export function getLevelCardImageUrls(level: LevelData | null | undefined): string[] {
  const urls = new Set<string>();
  for (const frameUrl of CARD_FRAME_URLS) urls.add(frameUrl);

  if (!level) return [...urls];

  for (const card of level.cards) {
    const url = resolveImageUrl(card.imageUrl);
    if (url) urls.add(url);
  }

  return [...urls];
}

export async function preloadLevelCardImages(level: LevelData | null | undefined): Promise<void> {
  const urls = getLevelCardImageUrls(level);
  if (urls.length === 0) return;

  await Promise.allSettled(urls.map((url) => preloadImage(url)));
}

export async function preloadCriticalCardFrameImages(): Promise<void> {
  await Promise.all(
    CARD_FRAME_URLS.map((url) => preloadImage(url, CRITICAL_PRELOAD_TIMEOUT_MS)),
  );
}

export function clearImagePreloadCache(): void {
  imagePreloadCache.clear();
}
