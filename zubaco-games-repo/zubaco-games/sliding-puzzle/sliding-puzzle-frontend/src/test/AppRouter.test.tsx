import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AppRouter } from '../app/router/AppRouter';

// Mock components used in router
const MockedPage = ({ text }: { text: string }) => (
  <div data-testid={text.toLowerCase().replaceAll(' ', '-')}>{text}</div>
);

jest.mock('@pages/SlidingPuzzlePage', () => ({
  __esModule: true,
  default: () => <MockedPage text="Sliding Puzzle Page" />,
}));

jest.mock('@pages/NotFoundPage', () => ({
  __esModule: true,
  default: () => <MockedPage text="Not Found Page" />,
}));

// Mock BrowserRouter to use MemoryRouter internally so we can control history
jest.mock('react-router-dom', () => {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
  const actual = jest.requireActual('react-router-dom');
  const MemoryRouter = actual.MemoryRouter;
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[globalThis.location.pathname]}>{children}</MemoryRouter>
    ),
  };
});

describe('AppRouter', () => {
  it('renders the sliding puzzle page at the root route', async () => {
    globalThis.history.pushState({}, 'Home', '/');
    render(<AppRouter />);

    await waitFor(
      () => {
        expect(screen.getByTestId('sliding-puzzle-page')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('renders the sliding puzzle page at the /game route (via redirect)', async () => {
    globalThis.history.pushState({}, 'Game', '/game');
    render(<AppRouter />);

    await waitFor(
      () => {
        expect(screen.getByTestId('sliding-puzzle-page')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('renders not found page for unknown routes', async () => {
    // Note: BrowserRouter mock above uses globalThis.location.pathname
    // jsdom updates location on pushState
    globalThis.history.pushState({}, 'Test Page', '/404');

    render(<AppRouter />);

    await waitFor(
      () => {
        expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
