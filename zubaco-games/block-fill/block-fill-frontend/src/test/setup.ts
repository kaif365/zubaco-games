import { vi } from 'vitest';

vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8999/');
vi.stubEnv('VITE_API_TIMEOUT', '10000');
vi.stubEnv('VITE_USER_STAGE_ID', '11111111-1111-1111-1111-111111111111');
vi.stubEnv('VITE_USER_SERVICE_BASE_URL', 'http://localhost:8001/');
vi.stubEnv('VITE_GAME_SERVICE_BASE_URL', 'http://localhost:8000');

import '@testing-library/jest-dom/vitest';

/** jsdom has no `matchMedia`; `useCompactLandscape` and similar hooks need it. */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/** jsdom has no `IntersectionObserver`; embla-carousel needs it for slides-in-view. */
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

/** jsdom has no `ResizeObserver`; embla-carousel and PhaserFlowBoard depend on it. */
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

function devSessionResponse() {
  return {
    success: true,
    statusCode: 201,
    message: 'Success',
    data: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      stageId: '11111111-1111-1111-1111-111111111111',
      user: { id: 'u1', name: 'Test Player' },
    },
  };
}

function gameSessionStartResponse() {
  return {
    success: true,
    statusCode: 201,
    message: 'Success',
    data: {
      sessionId: 'test-session-id',
      stageId: '11111111-1111-1111-1111-111111111111',
      status: 'ACTIVE',
      currentRoundNumber: 1,
      totalRounds: 3,
      board: {
        sessionBoardId: 'test-session-board',
        boardId: 'test-board',
        name: 'Test Board',
        difficulty: 'easy',
        gameType: 'BLOCK_FILL',
        gridRow: 4,
        gridCol: 4,
        nodes: [
          {
            colorCode: 'cyan',
            points: [
              { row: 0, col: 0 },
              { row: 0, col: 3 },
            ],
          },
        ],
        timeLimit: 90,
        version: 0,
      },
    },
  };
}

function urlString(input: RequestInfo | URL) {
  return typeof input === 'string'
    ? input
    : input instanceof Request
      ? input.url
      : input.toString();
}

globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
  const url = urlString(input);
  if (url.includes('/user/auth/dev-session')) {
    return Promise.resolve(
      new Response(JSON.stringify(devSessionResponse()), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  if (url.includes('/game/session/game-configs')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: {
            stageId: '11111111-1111-1111-1111-111111111111',
            timeLimit: 300,
            enableDemo: false,
            totalRounds: 3,
            totalDemoRounds: 0,
            levels: [],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }
  if (url.includes('/game/session/start')) {
    return Promise.resolve(
      new Response(JSON.stringify(gameSessionStartResponse()), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  if (url.includes('/game/session/save-progress')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: { version: 1 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }
  if (url.includes('/game/session/complete-board')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: { completed: true, version: 2 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }
  if (url.includes('/game/session/next-board')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: {
            sessionId: 'test-session-id',
            stageId: '11111111-1111-1111-1111-111111111111',
            status: 'ACTIVE',
            currentRoundNumber: 2,
            totalActualRounds: 3,
            board: {
              sessionBoardId: 'test-session-board-2',
              boardId: 'test-board-2',
              name: 'Test Board 2',
              difficulty: 'easy',
              gameType: 'BLOCK_FILL',
              gridRow: 4,
              gridCol: 4,
              nodes: [
                {
                  colorCode: 'pink',
                  points: [
                    { row: 0, col: 0 },
                    { row: 3, col: 3 },
                  ],
                },
              ],
              timeLimit: 90,
              version: 0,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }

  if (url.includes('/current-board')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: {
            sessionId: 'test-restore-session',
            stageId: '11111111-1111-1111-1111-111111111111',
            status: 'ACTIVE',
            currentLevelId: 'test-board',
            totalDemoRounds: 0,
            totalActualRounds: 3,
            currentDemoRound: 0,
            currentActualRound: 1,
            requestedDemoRound: 0,
            requestedActualRound: 1,
            isDemoRound: false,
            isActualRound: true,
            endTime: new Date(Date.now() + 180000).toISOString(),
            board: {
              sessionBoardId: 'test-session-board',
              boardId: 'test-board',
              name: 'Test Board',
              difficulty: 'easy',
              gameType: 'BLOCK_FILL',
              gridRow: 4,
              gridCol: 4,
              nodes: [
                {
                  colorCode: 'cyan',
                  points: [
                    { row: 0, col: 0 },
                    { row: 0, col: 3 },
                  ],
                },
              ],
              timeLimit: 90,
              version: 1,
              paths: [],
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }
  if (url.includes('/game/session/game-end')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Success',
          data: { finalScore: 42 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }

  return Promise.resolve(new Response('Not found', { status: 404 }));
}) as typeof fetch;
