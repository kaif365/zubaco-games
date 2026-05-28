import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardGrid } from '@/components/CardGrid';
import { GAME_STATES } from '@/constants/game.constants';
import type { MemoryCard } from '@/models/game.types';

const makeCard = (id: string, pairId: string, overrides: Partial<MemoryCard> = {}): MemoryCard => ({
  id,
  pairId,
  contentType: 'symbol',
  content: '♠',
  isFlipped: false,
  isMatched: false,
  ...overrides,
});

const twoCards = [makeCard('pair-0-a', 'pair-0'), makeCard('pair-0-b', 'pair-0')];

describe('CardGrid', () => {
  it('renders a button for each card', () => {
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.PLAYING}
        isAnimating={false}
        onCardTap={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('calls onCardTap when a face-down card is clicked in PLAYING state', () => {
    const onCardTap = vi.fn();
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.PLAYING}
        isAnimating={false}
        onCardTap={onCardTap}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCardTap).toHaveBeenCalledWith('pair-0-a');
  });

  it('disables tap when gameState is PREVIEW', () => {
    const onCardTap = vi.fn();
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.PREVIEW}
        isAnimating={false}
        onCardTap={onCardTap}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCardTap).not.toHaveBeenCalled();
  });

  it('disables tap when gameState is CHECKING_MATCH', () => {
    const onCardTap = vi.fn();
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.CHECKING_MATCH}
        isAnimating={false}
        onCardTap={onCardTap}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCardTap).not.toHaveBeenCalled();
  });

  it('disables tap when gameState is FINISHED', () => {
    const onCardTap = vi.fn();
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.FINISHED}
        isAnimating={false}
        onCardTap={onCardTap}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCardTap).not.toHaveBeenCalled();
  });

  it('disables tap when isAnimating is true', () => {
    const onCardTap = vi.fn();
    render(
      <CardGrid
        cards={twoCards}
        columns={2}
        gameState={GAME_STATES.PLAYING}
        isAnimating={true}
        onCardTap={onCardTap}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onCardTap).not.toHaveBeenCalled();
  });

  it('applies correct grid columns style', () => {
    const { container } = render(
      <CardGrid
        cards={twoCards}
        columns={4}
        gameState={GAME_STATES.PLAYING}
        isAnimating={false}
        onCardTap={vi.fn()}
      />,
    );
    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('renders empty grid when no cards', () => {
    render(
      <CardGrid
        cards={[]}
        columns={4}
        gameState={GAME_STATES.LOADING}
        isAnimating={false}
        onCardTap={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
