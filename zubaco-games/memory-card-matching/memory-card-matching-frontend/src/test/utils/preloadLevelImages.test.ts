import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LevelData } from '@/models/game.types';
import { getLevelCardImageUrls } from '@/utils/preloadLevelImages';

const makeLevel = (overrides: Partial<LevelData> = {}): LevelData => ({
  levelIndex: 0,
  gridRows: 2,
  gridColumns: 2,
  cardContentType: 'image',
  previewDurationSeconds: 3,
  mismatchDisplayDurationSeconds: 1,
  cards: [
    {
      id: 'pair-0-a',
      pairId: 'pair-0',
      contentType: 'image',
      content: '',
      imageUrl: '/uploads/a.webp',
    },
    {
      id: 'pair-0-b',
      pairId: 'pair-0',
      contentType: 'image',
      content: '',
      imageUrl: '/uploads/a.webp',
    },
    {
      id: 'pair-1-a',
      pairId: 'pair-1',
      contentType: 'image',
      content: '',
      imageUrl: 'https://cdn.example.com/b.webp',
    },
    {
      id: 'pair-1-b',
      pairId: 'pair-1',
      contentType: 'image',
      content: '',
      imageUrl: null,
    },
  ],
  ...overrides,
});

describe('preloadLevelImages', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns unique resolved image URLs for a level', () => {
    vi.stubEnv('VITE_CLOUDFRONT_URL', 'https://assets.example.com');

    const urls = getLevelCardImageUrls(makeLevel());

    expect(urls).toContain('https://assets.example.com/uploads/a.webp');
    expect(urls).toContain('https://cdn.example.com/b.webp');
    expect(urls.some((url) => url.includes('card-back.png'))).toBe(true);
    expect(urls.some((url) => url.includes('card-front.png'))).toBe(true);
  });

  it('returns static card frame URLs when there is no level', () => {
    const urls = getLevelCardImageUrls(null);
    expect(urls.some((url) => url.includes('card-back.png'))).toBe(true);
    expect(urls.some((url) => url.includes('card-front.png'))).toBe(true);
  });
});
