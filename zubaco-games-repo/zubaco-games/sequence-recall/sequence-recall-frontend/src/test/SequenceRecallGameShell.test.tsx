import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';

import { ApiErrorProvider } from '@/app/providers/ApiErrorProvider';
import { AudioProvider } from '@/audio/AudioProvider';
import { SequenceRecallGameShell } from '@/features/sequence-recall/components/SequenceRecallGameShell';
import { I18nProvider } from '@/lib/i18n';

jest.mock('@/features/sequence-recall/hooks/useGameConfig', () => ({
  useGameConfig: () => ({
    data: { totalRounds: 5, totalDemoRounds: 1 },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/sequence-recall/hooks/useGameConfigQuery', () => ({
  useGameConfigQuery: () => ({
    data: {
      boxCount: 4,
      turnLimit: 5,
      sessionTimerSeconds: 60,
      initialSequenceLength: 2,
      tutorialEnabledByDefault: false,
      playback: { tileFlashMs: 450, tileGapMs: 120, speedMultiplier: 1 },
      difficultyByLevel: { 1: { playbackMs: 450, gapMs: 120 } },
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/sequence-recall/hooks/useGameStart', () => ({
  useGameStart: () => ({
    mutateAsync: jest.fn().mockResolvedValue({
      gameSessionId: 'test-session-id',
      isDemo: true,
      currentRound: 0,
      current_demo_round: 1,
      current_actual_round: 0,
      sequence: [1, 2],
      endTime: new Date(Date.now() + 180_000).toISOString(),
      serverTime: new Date().toISOString(),
      timeDelay: 450,
      isResumed: false,
    }),
    isPending: false,
  }),
}));

jest.mock('@/features/sequence-recall/hooks/useTimeSync', () => ({
  useTimeSync: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/sequence-recall/hooks/useStageContent', () => ({
  useStageContent: () => ({
    contentByStage: undefined,
    isLoading: false,
    isError: false,
  }),
}));

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AudioProvider>
          <ApiErrorProvider>
            <SequenceRecallGameShell />
          </ApiErrorProvider>
        </AudioProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe('SequenceRecallGameShell', () => {
  it('renders lobby with micro-screen heading', async () => {
    renderShell();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^sequence recall$/i })).toBeInTheDocument();
    });
  });

  it('does not show tutorial or practice buttons in lobby', async () => {
    renderShell();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^sequence recall$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /tutorial/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /practice level/i })).not.toBeInTheDocument();
  });
});
