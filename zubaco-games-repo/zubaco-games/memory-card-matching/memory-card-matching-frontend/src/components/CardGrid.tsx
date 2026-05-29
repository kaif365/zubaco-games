import { memo, useLayoutEffect, useRef } from 'react';
import { MemoryCardView } from '@/components/MemoryCardView';
import { CARD_ASPECT_RATIO, GAME_STATES } from '@/constants/game.constants';
import type { MemoryCard, GameState } from '@/models/game.types';

interface CardGridProps {
  cards: MemoryCard[];
  columns: number;
  gameState: GameState;
  isAnimating: boolean;
  onCardTap: (id: string) => void;
}

const CardGrid = memo(({ cards, columns, gameState, isAnimating, onCardTap }: CardGridProps) => {
  const gridRef = useRef<HTMLDivElement | null>(null);

  const isInteractionDisabled =
    gameState === GAME_STATES.LOADING ||
    gameState === GAME_STATES.PREVIEW ||
    gameState === GAME_STATES.CHECKING_MATCH ||
    gameState === GAME_STATES.LEVEL_TRANSITION ||
    gameState === GAME_STATES.FINISHED ||
    isAnimating;

  const rows = Math.max(1, Math.ceil(cards.length / columns));
  const gridAspectRatio = columns / (rows * CARD_ASPECT_RATIO);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;

    const root = document.documentElement;
    let animationFrameId: number | null = null;

    const updateMandalaCenter = () => {
      animationFrameId = null;
      const rect = grid.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      root.style.setProperty('--memory-card-grid-center-y', `${rect.top + rect.height / 2}px`);
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(updateMandalaCenter);
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);

    scheduleUpdate();
    resizeObserver?.observe(grid);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      root.style.removeProperty('--memory-card-grid-center-y');
    };
  }, [cards.length, columns]);

  return (
    <div
      ref={gridRef}
      className="card-grid min-w-0"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        aspectRatio: `${gridAspectRatio}`,
        maxHeight: '100%',
        maxWidth: `min(100%, calc((100vh - 160px) * ${gridAspectRatio}))`,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {cards.map((card) => (
        <MemoryCardView
          key={card.id}
          card={card}
          onTap={onCardTap}
          isDisabled={isInteractionDisabled}
        />
      ))}
    </div>
  );
});

CardGrid.displayName = 'CardGrid';
export { CardGrid };
