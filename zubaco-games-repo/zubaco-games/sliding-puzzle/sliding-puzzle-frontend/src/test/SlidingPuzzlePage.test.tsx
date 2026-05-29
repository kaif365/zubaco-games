import { render, screen, waitFor } from '@testing-library/react';

import SlidingPuzzlePage from '../pages/SlidingPuzzlePage';

// Mock the GameContainer to avoid real API calls
jest.mock('../features/game/components/GameContainer', () => ({
  __esModule: true,
  default: () => <div>GameContainer</div>,
}));

describe('SlidingPuzzlePage', () => {
  it('renders GameContainer', async () => {
    render(<SlidingPuzzlePage />);

    await waitFor(() => {
      expect(screen.getByText('GameContainer')).toBeInTheDocument();
    });
  });
});
