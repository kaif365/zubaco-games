import { TimerBar } from '@/components/TimerBar';
import { GAME_STATES } from '@/constants/game.constants';
import type { GameState } from '@/models/game.types';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface GameHeaderProps {
  timeRemaining?: number;
  matchedPairs: number;
  totalPairs: number;
  gameState: GameState;
  currentLevelIndex: number;
  totalLevels: number;
  rightControl?: ReactNode;
}

const levelLabelClassName =
  'font-semibold text-[16px] md:text-[18px] tracking-[1px] md:tracking-[0.16px] text-white';

const GameHeader = memo(
  ({ timeRemaining, gameState, currentLevelIndex, rightControl }: GameHeaderProps) => {
    const { t } = useTranslation();
    const isPreview = gameState === GAME_STATES.PREVIEW;
    const isTransition = gameState === GAME_STATES.LEVEL_TRANSITION;

    const label = isPreview
      ? t('game.memorize')
      : isTransition
        ? t('game.levelComplete')
        : `Level ${currentLevelIndex + 1}`;

    return (
      <div className="gameplay-header">
        <span className={`${levelLabelClassName}${isPreview ? ' preview-hint' : ''}`}>{label}</span>
        {rightControl ?? <TimerBar timeRemaining={timeRemaining ?? 0} />}
      </div>
    );
  },
);

GameHeader.displayName = 'GameHeader';
export { GameHeader };
