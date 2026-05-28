import { memo, type CSSProperties } from 'react';
import type { MemoryCard } from '@/models/game.types';
import {
  FLIP_ANIMATION_DURATION_MS,
  CARD_ASPECT_RATIO,
} from '@/constants/game.constants';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import cardBack from '@micro-screens/assets/cards/card-back.png';
import cardFront from '@micro-screens/assets/cards/card-front.png';
import { MEMORY_CARD_DOM_ATTRS } from '@/animations/memorycard-animations';
import styles from './MemoryCardView.module.css';

interface MemoryCardViewProps {
  card: MemoryCard;
  onTap: (id: string) => void;
  isDisabled: boolean;
}

const CardBack = () => (
  <div className={styles.back}>
    <img
      src={cardBack}
      alt="Card Back"
      className={styles.backImage}
      decoding="async"
      draggable={false}
      fetchPriority="high"
      loading="eager"
    />
  </div>
);

interface CardFrontProps {
  card: MemoryCard;
}

const CardFront = ({ card }: CardFrontProps) => {
  const isHighlighted = card.isMatched || card.isFlipped;
  const resolvedImageUrl = resolveImageUrl(card.imageUrl);
  const shouldRenderImage = Boolean(resolvedImageUrl);

  return (
    <div className={styles.front}>
      <img
        src={cardFront}
        alt=""
        className={styles.frontImage}
        decoding="async"
        draggable={false}
        fetchPriority="high"
        loading="eager"
      />
      <div className={styles.symbolWell}>
        {shouldRenderImage ? (
          <img
            src={resolvedImageUrl ?? undefined}
            alt=""
            className={cn(styles.symbol, isHighlighted && styles.symbolMatched)}
            decoding="async"
            draggable={false}
            loading="eager"
          />
        ) : (
          <span className={cn(styles.symbol, isHighlighted && styles.symbolMatched)}>
            {card.content}
          </span>
        )}
      </div>
    </div>
  );
};

const MemoryCardView = memo(({ card, onTap, isDisabled }: MemoryCardViewProps) => {
  const canTap = !isDisabled && !card.isMatched && !card.isFlipped;
  const yDeg = card.isFlipped || card.isMatched ? '180deg' : '0deg';

  const innerStyle: CSSProperties = {
    transition: `transform ${FLIP_ANIMATION_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    ...({ '--memory-card-y': yDeg } as CSSProperties),
  };

  return (
    <div
      {...{ [MEMORY_CARD_DOM_ATTRS.cardId]: card.id }}
      className={styles.wrapper}
      style={{
        aspectRatio: `1 / ${CARD_ASPECT_RATIO}`,
        maxHeight: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
      onClick={() => canTap && onTap(card.id)}
      onTouchEnd={(e) => {
        e.preventDefault();
        if (canTap) onTap(card.id);
      }}
      role="button"
      aria-label={card.isFlipped || card.isMatched ? `Card: ${card.content}` : 'Face-down card'}
      aria-pressed={card.isFlipped}
    >
      <div
        {...{ [MEMORY_CARD_DOM_ATTRS.inner]: '' }}
        className={cn(styles.inner, canTap && styles.innerInteractive)}
        style={innerStyle}
      >
        <CardBack />
        <CardFront card={card} />
      </div>
    </div>
  );
});

MemoryCardView.displayName = 'MemoryCardView';
export { MemoryCardView };




