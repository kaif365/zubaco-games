import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import SlidingPuzzlePage from '../pages/SlidingPuzzlePage';

// Mock the GameContainer to avoid real API calls
jest.mock('@features/game/components/GameContainer', () => ({
  __esModule: true,
  default: () => <div>GameContainer</div>,
}));

describe('SlidingPuzzlePage', () => {
  it('renders menu screen initially', () => {
    render(<SlidingPuzzlePage />);
    expect(screen.getByRole('heading', { name: /sliding puzzle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('navigates to GameContainer when Play is clicked', async () => {
    render(<SlidingPuzzlePage />);
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText('GameContainer')).toBeInTheDocument();
    });
  });
});

