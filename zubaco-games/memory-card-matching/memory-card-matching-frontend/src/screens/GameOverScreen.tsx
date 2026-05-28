import { GameSuccessScreen, GameFailureScreen } from '@micro-screens/src';
import type { StageId, GameResultContentMap } from '@micro-screens/src';
import type { GameOverStats } from '@/models/game.types';

interface GameOverScreenProps {
  stats: GameOverStats;
  stage: StageId;
  onContinue: () => void;
  // TODO: swap with API-fetched content when backend provides result screen copy
  contentByStage?: Partial<GameResultContentMap>;
}

export function GameOverScreen({ stats, stage, onContinue, contentByStage }: GameOverScreenProps) {
  const isWin = stats.result === 'win';

  return isWin ? (
    <GameSuccessScreen
      stage={stage}
      score={stats.finalScore}
      completedGames={stats.levelsCompleted}
      totalGames={stats.totalLevels}
      contentByStage={contentByStage}
      onContinue={onContinue}
    />
  ) : (
    <GameFailureScreen
      stage={stage}
      score={stats.finalScore}
      completedGames={stats.levelsCompleted}
      totalGames={stats.totalLevels}
      contentByStage={contentByStage}
      onContinue={onContinue}
    />
  );
}
