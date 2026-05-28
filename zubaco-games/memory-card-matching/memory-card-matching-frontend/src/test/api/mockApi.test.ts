import { gameApi } from '@/api/gameApi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.useFakeTimers();

beforeEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // .env.test sets stage/encryption; tests stub only what they need.
  vi.stubEnv('VITE_STAGE_NUMBER', '');
  vi.stubEnv('VITE_ENCRYPTION_KEY', '');
  localStorage.clear();
});

describe('gameApi.getGameConfig', () => {
  it('resolves with gameTimeLimitSeconds, totalLevels, and showDemo', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: {
          gameTimeLimitSeconds: 180,
          totalLevels: 1,
          enableDemo: true,
        },
      }),
    } as Response);

    const result = await gameApi.getGameConfig();

    expect(result).toMatchObject({
      gameTimeLimitSeconds: expect.any(Number),
      totalLevels: expect.any(Number),
      showDemo: expect.any(Boolean),
    });
    expect(result.gameTimeLimitSeconds).toBe(180);
    expect(result.totalLevels).toBe(1);
    expect(result.showDemo).toBe(true);
    expect(result.stageNumber).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.180.1.190:3002/v1/game/session/game-configs',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('uses VITE_STAGE_NUMBER when set, overriding API stageNumber', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    vi.stubEnv('VITE_STAGE_NUMBER', '4');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: {
          gameTimeLimitSeconds: 180,
          totalLevels: 1,
          enableDemo: true,
          stageNumber: 1,
        },
      }),
    } as Response);

    const result = await gameApi.getGameConfig();
    expect(result.stageNumber).toBe(4);
  });
});

describe('gameApi.startGame', () => {
  it('resolves with a sessionId string', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/image-1.jpg',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/image-2.jpg',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/image-2.jpg',
              },
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/image-1.jpg',
              },
            ],
          },
        },
      }),
    } as Response);

    const result = await gameApi.startGame();

    expect(typeof result.sessionId).toBe('string');
    expect(result.sessionId.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.180.1.190:3002/v1/game/session/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
        headers: expect.objectContaining({
          accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('returns firstLevel with required level fields', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
            ],
          },
        },
      }),
    } as Response);

    const { firstLevel } = await gameApi.startGame();

    expect(firstLevel).toMatchObject({
      levelIndex: 0,
      gridRows: expect.any(Number),
      gridColumns: expect.any(Number),
      cardContentType: expect.any(String),
      previewDurationSeconds: expect.any(Number),
      mismatchDisplayDurationSeconds: expect.any(Number),
    });
    expect(firstLevel.gridRows).toBeGreaterThan(0);
    expect(firstLevel.gridColumns).toBeGreaterThan(0);
  });

  it('firstLevel.cards has correct total count for grid size', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
            ],
          },
        },
      }),
    } as Response);
    const { firstLevel } = await gameApi.startGame();

    expect(firstLevel.cards).toHaveLength(firstLevel.gridRows * firstLevel.gridColumns);
  });

  it('firstLevel.cards have required fields', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
            ],
          },
        },
      }),
    } as Response);
    const { firstLevel } = await gameApi.startGame();

    firstLevel.cards.forEach((card) => {
      expect(card).toMatchObject({
        id: expect.any(String),
        pairId: expect.any(String),
        contentType: expect.any(String),
        content: expect.any(String),
      });
      expect(card.imageUrl === null || typeof card.imageUrl === 'string').toBe(true);
    });
  });

  it('firstLevel.cards are in pairs — each pairId appears exactly twice', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
            ],
          },
        },
      }),
    } as Response);
    const { firstLevel } = await gameApi.startGame();

    const pairCounts = new Map<string, number>();
    firstLevel.cards.forEach((c) => pairCounts.set(c.pairId, (pairCounts.get(c.pairId) ?? 0) + 1));
    pairCounts.forEach((count) => expect(count).toBe(2));
  });

  it('each card pair shares the same content', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    vi.stubEnv('VITE_STAGE_ID', 'd13e13c5-cd28-4ccf-82ea-c5b71a8edd11');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 201,
        message: 'OK',
        data: {
          sessionId: 'sess-eca4fedc-7e8b-4ad5-abdc-4bd905ce0ea7',
          firstLevel: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 0,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 5,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'x',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'y',
              },
            ],
          },
        },
      }),
    } as Response);
    const { firstLevel } = await gameApi.startGame();

    const pairContent = new Map<string, string>();
    firstLevel.cards.forEach((c) => {
      if (pairContent.has(c.pairId)) {
        expect(c.content).toBe(pairContent.get(c.pairId));
      } else {
        pairContent.set(c.pairId, c.content);
      }
    });
  });
});

describe('gameApi.gameOver', () => {
  it('resolves with a numeric finalScore and rank', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: { finalScore: 1500, rank: 3 },
      }),
    } as Response);

    const result = await gameApi.gameOver({ sessionId: 'test-session' });

    expect(typeof result.finalScore).toBe('number');
    expect(typeof result.rank).toBe('number');
    expect(result.rank).toBeGreaterThan(0);
  });

  it('returns finalScore of 0 on lose', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: { finalScore: 0, rank: 0 },
      }),
    } as Response);

    const result = await gameApi.gameOver({ sessionId: 'test-session' });
    expect(result.finalScore).toBe(0);
  });
});

describe('gameApi.trackEvent', () => {
  it('resolves without error', async () => {
    const promise = gameApi.trackEvent({
      event: 'game_started',
      timestamp: Date.now(),
      data: { totalLevels: 3 },
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('gameApi.saveProgress', () => {
  it('calls save-progress endpoint with move payload', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: { saved: true },
      }),
    } as Response);

    const payload = {
      moves: [
        {
          id: 'card-1',
          clickedAt: '2026-05-07T12:10:15.000Z',
          moveId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        },
        {
          id: 'card-4',
          clickedAt: '2026-05-07T12:10:33.000Z',
          moveId: 'ca761232-ed42-11ce-bacd-00aa0057b223',
        },
      ],
    };

    await expect(gameApi.saveProgress(payload)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.180.1.190:3002/v1/game/session/save-progress',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});

describe('gameApi.getNextLevel', () => {
  it('calls next-level endpoint with sessionId and returns level payload', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://192.180.1.190:3002');
    localStorage.setItem('ZUBACO_auth_token', 'token');

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: {
          level: {
            id: '1636ebaf-78df-4957-b2ef-de453709cff4',
            levelIndex: 1,
            gridRows: 2,
            gridColumns: 2,
            cardContentType: 'image',
            previewDurationSeconds: 2,
            mismatchDisplayDurationSeconds: 1,
            cards: [
              {
                id: 'pair-0-b',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/a.jpg',
              },
              {
                id: 'pair-1-b',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/b.jpg',
              },
              {
                id: 'pair-0-a',
                pairId: 'pair-0',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/a.jpg',
              },
              {
                id: 'pair-1-a',
                pairId: 'pair-1',
                contentType: 'image',
                content: '',
                imageUrl: 'https://example.com/b.jpg',
              },
            ],
          },
        },
      }),
    } as Response);

    const sessionId = 'sess-aa5557c0-cad4-45a4-ba1d-fa32da7773bb';
    const result = await gameApi.getNextLevel(sessionId);

    expect(result.level.levelIndex).toBe(1);
    expect(result.level.cards).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.180.1.190:3002/v1/game/session/next-level',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});
