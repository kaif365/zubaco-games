import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryCardView } from '@/components/MemoryCardView';
import type { MemoryCard } from '@/models/game.types';

const makeCard = (overrides: Partial<MemoryCard> = {}): MemoryCard => ({
  id: 'pair-0-a',
  pairId: 'pair-0',
  contentType: 'symbol',
  content: '♠',
  isFlipped: false,
  isMatched: false,
  ...overrides,
});

describe('MemoryCardView', () => {
  it('renders face-down card with correct aria-label', () => {
    render(<MemoryCardView card={makeCard()} onTap={vi.fn()} isDisabled={false} />);
    expect(screen.getByRole('button', { name: 'Face-down card' })).toBeInTheDocument();
  });

  it('renders face-up card with content in aria-label', () => {
    render(<MemoryCardView card={makeCard({ isFlipped: true })} onTap={vi.fn()} isDisabled={false} />);
    expect(screen.getByRole('button', { name: /Card: ♠/ })).toBeInTheDocument();
  });

  it('calls onTap with card id when clicked and canTap', () => {
    const onTap = vi.fn();
    render(<MemoryCardView card={makeCard()} onTap={onTap} isDisabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledWith('pair-0-a');
  });

  it('does not call onTap when isDisabled', () => {
    const onTap = vi.fn();
    render(<MemoryCardView card={makeCard()} onTap={onTap} isDisabled={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not call onTap when card is already flipped', () => {
    const onTap = vi.fn();
    render(<MemoryCardView card={makeCard({ isFlipped: true })} onTap={onTap} isDisabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not call onTap when card is matched', () => {
    const onTap = vi.fn();
    render(<MemoryCardView card={makeCard({ isMatched: true, isFlipped: true })} onTap={onTap} isDisabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).not.toHaveBeenCalled();
  });

  it('renders card content text', () => {
    render(<MemoryCardView card={makeCard({ isFlipped: true })} onTap={vi.fn()} isDisabled={false} />);
    expect(screen.getByText('♠')).toBeInTheDocument();
  });

  it('aria-pressed reflects isFlipped', () => {
    const { rerender } = render(<MemoryCardView card={makeCard({ isFlipped: false })} onTap={vi.fn()} isDisabled={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<MemoryCardView card={makeCard({ isFlipped: true })} onTap={vi.fn()} isDisabled={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
