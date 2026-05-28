import { useEffect, useRef } from 'react';
import { useMemoryGame } from '@/game/useMemoryGame';
import { CardGrid } from '@/components/CardGrid';
import { GameHeader } from '@/components/GameHeader';
import { RoundTransitionOverlay } from '@/components/RoundTransitionOverlay';
import {
  DEMO_COMPLETE_DELAY_MS,
  DEMO_ROUND_TRANSITION_DELAY_MS,
  GAME_STATES,
} from '@/constants/game.constants';
import { useDemoLevels } from '@/hooks/useDemoLevels';
import { useMemoryCardJuiceAnimations } from '@/hooks/useMemoryCardJuiceAnimations';
import { useMemoryGameSoundEffects } from '@/hooks/useMemoryGameSoundEffects';
import { useTranslation } from 'react-i18next';

const DEMO_TIMER_SECONDS = 86400;

interface DemoScreenProps {
  onDemoComplete: () => void;
  onDemoSkip: () => void;
}

export function DemoScreen({ onDemoComplete, onDemoSkip }: DemoScreenProps) {
  const { t } = useTranslation();
  const { demoLevels, isLoading: isDemoLoading } = useDemoLevels();

  const {
    cards,
    gameState,
    currentLevelIndex,
    currentLevelColumns,
    isAnimating,
    handleCardTap,
    initGame,
    loadNextLevel,
    matchedPairs,
    totalPairs,
    totalLevels,
  } = useMemoryGame();

  useMemoryGameSoundEffects(gameState, cards, matchedPairs);
  useMemoryCardJuiceAnimations(gameState, cards, matchedPairs);

  const initializedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!demoLevels || initializedRef.current) return;
    initializedRef.current = true;
    initGame('demo', demoLevels.length, DEMO_TIMER_SECONDS, demoLevels[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoLevels]);

  useEffect(() => {
    if (!demoLevels) return;

    if (gameState === GAME_STATES.LEVEL_TRANSITION) {
      const nextIndex = currentLevelIndex + 1;
      if (nextIndex < demoLevels.length) {
        const t = setTimeout(
          () => loadNextLevel(demoLevels[nextIndex]),
          DEMO_ROUND_TRANSITION_DELAY_MS,
        );
        return () => clearTimeout(t);
      }
    }

    if (gameState === GAME_STATES.FINISHED && !doneRef.current) {
      doneRef.current = true;
      const t = setTimeout(() => onDemoComplete(), DEMO_COMPLETE_DELAY_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentLevelIndex, demoLevels]);

  return (
    <div className="gameplay-screen w-full h-full flex flex-col max-w-[465px] mx-auto py-5 px-4">
      <GameHeader
        matchedPairs={matchedPairs}
        totalPairs={totalPairs}
        gameState={gameState}
        currentLevelIndex={currentLevelIndex}
        totalLevels={totalLevels}
        rightControl={
          <button
            type="button"
            onClick={onDemoSkip}
            className="gameplay-header-inner cursor-pointer"
          >
            <span className="timer-badge">
              <span className="timer-badge__content">
                <span className="timer-badge__text">
                  <span className="timer-badge__value">{t('demo.skip')}</span>
                </span>
              </span>
            </span>
          </button>
        }
      />

      <div
        className="gameplay-grid-wrapper"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '16px',
          overflow: 'hidden',
        }}
      >
        {isDemoLoading ? (
          <div className="auth-gate-spinner" />
        ) : (
          <>
            <RoundTransitionOverlay show={gameState === GAME_STATES.LEVEL_TRANSITION} />
            <CardGrid
              cards={cards}
              columns={currentLevelColumns}
              gameState={gameState}
              isAnimating={isAnimating}
              onCardTap={handleCardTap}
            />
          </>
        )}
      </div>
    </div>
  );
}
