import { useQuery } from '@tanstack/react-query';

import { defaultGameConfig } from '@/config/gameConfig';
import type { GameConfigResponse } from '@/types/api.types';
import type { GameConfig } from '@/types/game';
import { appConfig } from '@app/config/appConfig';

import { gameConfigQueryOptions } from '../api/gameConfig.query';

/**
 * Maps to game config.
 *
 * @param {GameConfigResponse} api - The api.
 *
 * @returns {GameConfig} The result of mapToGameConfig.
 */
function mapToGameConfig(api: GameConfigResponse): GameConfig {
  return {
    ...defaultGameConfig,
    boxCount: api.cellCount,
    turnLimit: api.totalRounds,
    sessionTimerSeconds: api.timeLimit,
    initialSequenceLength: api.minSequence,
    baseScorePerSound: api.scorePerClick,
    wrongMoveHandling: api.wrongMoveHandling,
    playback: {
      ...defaultGameConfig.playback,
      tileFlashMs: api.flashDelay,
      tileGapMs: api.flashDelay,
      inputGlowMs: api.flashDelay,
    },
  };
}

/**
 * Hook for game config query.
 *
 * @returns {DefinedQueryObserverResult<GameConfig, Error> | QueryObserverLoadingErrorResult<GameConfig, Error> | QueryObserverLoadingResult<GameConfig, Error> | QueryObserverPendingResult<GameConfig, Error> | QueryObserverPlaceholderResult<GameConfig, Error>} The result of useGameConfigQuery.
 */
export function useGameConfigQuery() {
  const stageId = appConfig.socket.stageId;

  return useQuery({
    ...gameConfigQueryOptions(stageId),
    select: mapToGameConfig,
  });
}
