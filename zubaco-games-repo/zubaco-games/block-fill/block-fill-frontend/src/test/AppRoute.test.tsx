import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AudioProvider } from '@/audio';
import { App } from '@/app/App';
import { AppProviders } from '@/app/providers/AppProviders';
import { I18nProvider } from '@/lib/i18n';

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
        <AudioProvider>
          <AppProviders>{node}</AppProviders>
        </AudioProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe('App stage flow', () => {
  it('shows stage start screen and begins on Play Now click', async () => {
    renderWithQueryClient(<App />);

    expect(
      await screen.findByRole('region', { name: /game instructions screen/i }),
    ).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /play now/i }));
    expect(await screen.findByTestId('phaser-flow-board-mock')).toBeInTheDocument();
  });
});
