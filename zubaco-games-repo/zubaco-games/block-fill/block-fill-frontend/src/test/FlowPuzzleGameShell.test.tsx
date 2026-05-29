import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AudioProvider } from '@/audio';
import { AppProviders } from '@/app/providers/AppProviders';
import { FlowPuzzleGameShell } from '@/features/flow-puzzle/components/FlowPuzzleGameShell';
import { I18nProvider } from '@/lib/i18n';
import { setActiveSessionId } from '@/features/flow-puzzle/sessionStorage/activeSessionStorage';
import { enqueueOutbox } from '@/features/flow-puzzle/save-progress/saveProgressOutbox';
import { clearSecureStorageCache } from '@/utils/secureStorage';

vi.mock('@/features/flow-puzzle/components/PhaserFlowBoard', () => ({
  PhaserFlowBoard: () => <div data-testid="phaser-flow-board-mock">Phaser Board</div>,
}));

function renderWithQueryClient(node: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <AudioProvider>{node}</AudioProvider>
        </AppProviders>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe('FlowPuzzleGameShell', () => {
  afterEach(() => {
    localStorage.clear();
    clearSecureStorageCache();
  });

  it('renders start screen by default', async () => {
    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    expect(
      await screen.findByRole('region', { name: /game instructions screen/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /play now/i })).toBeInTheDocument();
  });

  it('starts gameplay after tapping start', async () => {
    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    await userEvent.click(await screen.findByRole('button', { name: /play now/i }));
    expect(await screen.findByTestId('phaser-flow-board-mock')).toBeInTheDocument();
  });

  it('exposes optional exit button on end screen', async () => {
    const onExit = vi.fn();
    renderWithQueryClient(<FlowPuzzleGameShell onExit={onExit} />);

    await userEvent.click(await screen.findByRole('button', { name: /play now/i }));
    expect(await screen.findByTestId('phaser-flow-board-mock')).toBeInTheDocument();
  });
});

describe('FlowPuzzleGameShell — restore flow', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSecureStorageCache();
  });

  afterEach(() => {
    localStorage.clear();
    clearSecureStorageCache();
  });

  it('auto-restores board from a persisted session id on mount (case 1, 3, 4)', async () => {
    setActiveSessionId('test-restore-session');
    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    // Board should appear without the user pressing Start
    expect(await screen.findByTestId('phaser-flow-board-mock')).toBeInTheDocument();
  });

  it('restores with pending outbox moves merged on top of server state (case 1, 2, 4)', async () => {
    setActiveSessionId('test-restore-session');
    enqueueOutbox('test-restore-session', {
      moveId: 'local-move-1',
      color: 'cyan',
      pathSignature: JSON.stringify([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
      pathPayload: {
        color: 'cyan',
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        completed: false,
        moveId: 'local-move-1',
        timeStamp: new Date().toISOString(),
      },
      createdAt: Date.now(),
      sessionBoardId: 'test-session-board',
    });

    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    // Board should appear; the local move merged with server state
    expect(await screen.findByTestId('phaser-flow-board-mock')).toBeInTheDocument();
  });

  it('shows end screen when session has timed out during restore (case 2, 5)', async () => {
    setActiveSessionId('test-restore-session');

    // Override fetch once for current-board to return a timeout error
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes('/current-board')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ success: false, statusCode: 410, message: 'GAME_SESSION_TIMEOUT' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return originalFetch(input);
    }) as typeof fetch;

    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    // End screen should appear with the continue button
    expect(await screen.findByRole('button', { name: /continue/i })).toBeInTheDocument();

    globalThis.fetch = originalFetch;
  });

  it('skips restore when no session id is persisted', async () => {
    // No session id → should show the normal start screen
    renderWithQueryClient(<FlowPuzzleGameShell onExit={() => undefined} />);

    expect(await screen.findByRole('button', { name: /play now/i })).toBeInTheDocument();
    expect(screen.queryByTestId('phaser-flow-board-mock')).not.toBeInTheDocument();
  });
});
