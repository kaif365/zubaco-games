import type { GameResultContentMap, GameResultVariant } from './result-content';
import type { StageId } from './stage-theme';

export interface BaseGameResultScreenProps {
  stage: StageId;
  score: number;
  completedGames: number;
  totalGames: number;
  variant: GameResultVariant;
  isTimeUp?: boolean;
  contentByStage?: Partial<GameResultContentMap>;
  onContinue?: (stage: StageId) => void;
  className?: string;
}

export type GameSuccessScreenProps = Omit<BaseGameResultScreenProps, 'variant'>;

export type GameFailureScreenProps = Omit<BaseGameResultScreenProps, 'variant'>;
