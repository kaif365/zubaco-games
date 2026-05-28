import { gameApi } from '@/api/gameApi';
import { CardGrid } from '@/components/CardGrid';
import { GameHeader } from '@/components/GameHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RoundTransitionOverlay } from '@/components/RoundTransitionOverlay';
import {
  GAME_STATES,
  LEVEL_COMPLETE_CELEBRATION_MS,
  MAX_SAVE_PROGRESS_BATCH_CLICKS,
  MIN_SAVE_PROGRESS_BATCH_CLICKS,
  ROUND_TRANSITION_DELAY_MS,
  SAVE_PROGRESS_BATCH_CARD_RATIO,
  SESSION_STORAGE_KEY,
} from '@/constants/game.constants';
import { useMemoryGame } from '@/game/useMemoryGame';
import { useApiError } from '@/hooks/useApiError';
import { useGameConfig } from '@/hooks/useGameConfig';
import { getApiErrorMessage } from '@/lib/api/getApiErrorMessage';
import {
  useCompleteBoard,
  useFireAnalyticsEvent,
  useGameOver,
  usePrefetchNextLevel,
  useStartGame,
} from '@/hooks/useGameMutations';
import { useMemoryCardJuiceAnimations } from '@/hooks/useMemoryCardJuiceAnimations';
import { useMemoryGameSoundEffects } from '@/hooks/useMemoryGameSoundEffects';
import { useTimeSync } from '@/hooks/useTimeSync';
import { refreshDevSessionAuth } from '@/lib/devSessionAuth';
import type {
  CurrentSessionResponse,
  GameOverStats,
  LevelData,
  MoveEntry,
  StartGameResponse,
} from '@/models/game.types';
import { decryptString, encryptString } from '@/utils/encryption';
import {
  addPendingMoves,
  clearPending,
  readPending,
  removePendingMoves,
} from '@/utils/pendingProgress';
import {
  preloadCriticalCardFrameImages,
  preloadLevelCardImages,
} from '@/utils/preloadLevelImages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

interface GameplayScreenProps {
  onGameOver: (stats: GameOverStats) => void;
  onSessionExpired: () => void;
}

function getEncryptionKey(): string | null {
  return import.meta.env.VITE_ENCRYPTION_KEY ?? null;
}

async function storeSessionId(sessionId: string): Promise<void> {
  const hexKey = getEncryptionKey();
  const value = hexKey ? await encryptString(sessionId, hexKey) : sessionId;
  localStorage.setItem(SESSION_STORAGE_KEY, value);
}

async function loadSessionId(): Promise<string | null> {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  const hexKey = getEncryptionKey();
  if (!hexKey) return stored;
  // Try decrypting; fall back to plain value for backwards-compat
  const decrypted = await decryptString(stored, hexKey);
  return decrypted ?? stored;
}

/** Drop persisted session + local pending so the next start/resume hits the API cleanly. */
function clearStoredSessionKeys(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  clearPending();
}

function getAdaptiveSaveProgressBatchClicks(totalCards: number): number {
  const scaledBatchClicks = Math.floor(totalCards * SAVE_PROGRESS_BATCH_CARD_RATIO);
  return Math.max(
    MIN_SAVE_PROGRESS_BATCH_CLICKS,
    Math.min(MAX_SAVE_PROGRESS_BATCH_CLICKS, scaledBatchClicks),
  );
}

export function GameplayScreen({ onGameOver, onSessionExpired }: GameplayScreenProps) {
  const { t } = useTranslation();
  const { showApiError, clearApiError } = useApiError();
  const { config, isLoading: configLoading, refetch: refetchConfig } = useGameConfig();

  const startGame = useStartGame();
  const completeBoard = useCompleteBoard();
  const prefetchNextLevel = usePrefetchNextLevel();
  const gameOver = useGameOver();
  const fireAnalytics = useFireAnalyticsEvent();

  const game = useMemoryGame();
  const {
    sessionId,
    cards,
    gameState,
    timeRemaining,
    isAnimating,
    gameOverStats,
    matchedPairs,
    totalPairs,
    currentLevelIndex,
    totalLevels,
    currentLevelColumns,
    handleCardTap,
    initGame,
    loadNextLevel,
    syncTime,
  } = game;

  useMemoryGameSoundEffects(gameState, cards, matchedPairs);
  useMemoryCardJuiceAnimations(gameState, cards, matchedPairs);

  useTimeSync(
    sessionId,
    gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PREVIEW,
    syncTime,
  );

  const initializedRef = useRef(false);
  const gameEndFiredRef = useRef(false);
  const prefetchFiredRef = useRef(false);
  const completeBoardFiredRef = useRef(false);
  const prevMatchedPairsRef = useRef(0);
  const saveProgressQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Prefetched next-level data in state so effects react when it arrives
  const [prefetchedLevel, setPrefetchedLevel] = useState<LevelData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  /** Bumps when user retries load so init effect re-runs even if game-config query data is unchanged. */
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const [pendingMoveVersion, setPendingMoveVersion] = useState(0);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const saveProgressBatchClicks = getAdaptiveSaveProgressBatchClicks(cards.length);

  const preparePrefetchedLevel = useCallback((level: LevelData | null | undefined) => {
    if (!level) return;

    void preloadLevelCardImages(level).finally(() => {
      setPrefetchedLevel((prev) => prev ?? level);
    });
  }, []);

  const flushPendingMoves = useCallback(
    (targetSessionId: string, targetLevelIndex: number): Promise<void> => {
      const next = saveProgressQueueRef.current.then(async () => {
        const pending = await readPending(targetSessionId, targetLevelIndex);
        console.info('[GameplayScreen] flushPendingMoves:start', {
          sessionId: targetSessionId,
          levelIndex: targetLevelIndex,
          pendingMoves: pending.pendingMoves.length,
        });
        if (pending.pendingMoves.length === 0) return;
        console.info('[GameplayScreen] flushPendingMoves:saveProgress:request', {
          sessionId: targetSessionId,
          levelIndex: targetLevelIndex,
          moveIds: pending.pendingMoves.map((move) => move.moveId),
        });
        await gameApi.saveProgress({ moves: pending.pendingMoves });
        console.info('[GameplayScreen] flushPendingMoves:saveProgress:success', {
          sessionId: targetSessionId,
          levelIndex: targetLevelIndex,
          flushedMoves: pending.pendingMoves.length,
        });
        await removePendingMoves(
          targetSessionId,
          targetLevelIndex,
          pending.pendingMoves.map((move) => move.moveId),
        );
        const afterPending = await readPending(targetSessionId, targetLevelIndex);
        console.info('[GameplayScreen] flushPendingMoves:localQueueAfterRemoval', {
          sessionId: targetSessionId,
          levelIndex: targetLevelIndex,
          remainingMoves: afterPending.pendingMoves.length,
        });
      });
      // Keep queue alive even if one flush fails.
      saveProgressQueueRef.current = next.catch(() => {});
      return next;
    },
    [],
  );

  // Initialize game once config is loaded
  useEffect(() => {
    if (!config || configLoading || initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      try {
        const deriveTiming = (payload: {
          startTime: string;
          endTime: string;
          timeRemaining?: number;
        }) => {
          const startMs = Number(new Date(payload.startTime).getTime());
          const endMs = Number(new Date(payload.endTime).getTime());
          const nowMs = Date.now();
          const hasValidWindow =
            Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
          const gameTimeLimitSeconds = hasValidWindow
            ? Math.round((endMs - startMs) / 1000)
            : config.gameTimeLimitSeconds;
          const initialTimeRemaining = Number.isFinite(endMs)
            ? Math.max(0, Math.round((endMs - nowMs) / 1000))
            : (payload.timeRemaining ?? gameTimeLimitSeconds);
          return { gameTimeLimitSeconds, initialTimeRemaining };
        };

        const initializeFromPayload = (
          payload:
            | Pick<
                CurrentSessionResponse,
                | 'sessionId'
                | 'currentLevel'
                | 'matchedPairs'
                | 'timeRemaining'
                | 'startTime'
                | 'endTime'
              >
            | Pick<StartGameResponse, 'sessionId' | 'firstLevel' | 'startTime' | 'endTime'>,
          resumed: boolean,
        ) => {
          const level = 'currentLevel' in payload ? payload.currentLevel : payload.firstLevel;
          const restoredPairs = 'matchedPairs' in payload ? (payload.matchedPairs ?? []) : [];
          const timeRemaining = 'timeRemaining' in payload ? payload.timeRemaining : undefined;
          if (!level) throw new Error(t('game.missingLevelData'));

          void (async () => {
            const pendingPromise = readPending(payload.sessionId, level.levelIndex);
            const preloadPromise = Promise.all([
              preloadCriticalCardFrameImages(),
              preloadLevelCardImages(level),
            ]);
            const pending = await pendingPromise;
            console.info('[GameplayScreen] initialize:resumePendingRead', {
              resumed,
              sessionId: payload.sessionId,
              levelIndex: level.levelIndex,
              pendingMoves: pending.pendingMoves.length,
              apiMatchedPairs: restoredPairs.length,
            });
            const apiPairIdSet = new Set(restoredPairs.map((entry) => entry.pairId));
            const cardById = new Map(level.cards.map((card) => [card.id, card]));
            const firstTapByPair = new Map<string, string>();
            const localMatchedPairTimestamps = new Map<string, string>();

            for (const move of pending.pendingMoves) {
              const card = cardById.get(move.id);
              if (
                !card ||
                apiPairIdSet.has(card.pairId) ||
                localMatchedPairTimestamps.has(card.pairId)
              )
                continue;
              const firstTappedId = firstTapByPair.get(card.pairId);
              if (!firstTappedId) {
                firstTapByPair.set(card.pairId, card.id);
                continue;
              }
              if (firstTappedId !== card.id) {
                localMatchedPairTimestamps.set(card.pairId, move.clickedAt);
              }
            }

            const mergedMatchedPairs = [
              ...restoredPairs,
              ...Array.from(localMatchedPairTimestamps.entries()).map(([pairId, timestamp]) => ({
                pairId,
                timestamp,
              })),
            ];
            console.info('[GameplayScreen] initialize:mergedPairs', {
              sessionId: payload.sessionId,
              levelIndex: level.levelIndex,
              apiPairs: restoredPairs.length,
              localMergedPairs: localMatchedPairTimestamps.size,
              mergedTotalPairs: mergedMatchedPairs.length,
            });

            // Sync the ref before initGame so the save-progress effect doesn't fire
            // for pairs that were already matched in a previous session (on resume).
            prevMatchedPairsRef.current = mergedMatchedPairs.length;

            await preloadPromise;

            const { gameTimeLimitSeconds, initialTimeRemaining } = deriveTiming({
              startTime: payload.startTime,
              endTime: payload.endTime,
              timeRemaining,
            });

            initGame(
              payload.sessionId,
              config.totalLevels,
              gameTimeLimitSeconds,
              level,
              resumed,
              initialTimeRemaining,
              mergedMatchedPairs,
            );
            void storeSessionId(payload.sessionId);
            setInitError(null);
            fireAnalytics(
              'game_started',
              resumed
                ? { resumed: true, levelIndex: level.levelIndex }
                : { totalLevels: config.totalLevels },
            );

            if (pending.pendingMoves.length > 0) {
              console.info('[GameplayScreen] initialize:backgroundFlushTrigger', {
                sessionId: payload.sessionId,
                levelIndex: level.levelIndex,
                pendingMoves: pending.pendingMoves.length,
              });
              void flushPendingMoves(payload.sessionId, level.levelIndex);
            }
          })();
        };

        const storedSessionId = await loadSessionId();
        if (storedSessionId) {
          try {
            const current = await gameApi.getCurrentSession(storedSessionId);
            initializeFromPayload(current, true);
            return;
          } catch {
            clearStoredSessionKeys();
            try {
              const result = await gameApi.gameOver({ sessionId: storedSessionId });
              onGameOver({
                result: 'lose',
                finalScore: result.finalScore,
                rank: result.rank,
                timeRemaining: 0,
                timeTaken: config.gameTimeLimitSeconds,
                levelsCompleted: 0,
                totalLevels: config.totalLevels,
              });
            } catch {
              onSessionExpired();
            }
            return;
          }
        }

        try {
          const data = await startGame.mutateAsync();
          initializeFromPayload(data, false);
        } catch {
          clearStoredSessionKeys();
          startGame.reset();
          await refreshDevSessionAuth();
          const data = await startGame.mutateAsync();
          initializeFromPayload(data, false);
        }
      } catch (error) {
        clearStoredSessionKeys();
        startGame.reset();
        initializedRef.current = false;
        const message = error instanceof Error ? error.message : t('game.initFailed');
        setInitError(message);
        showApiError({
          title: t('errors.requestFailed'),
          description: getApiErrorMessage(error, message),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, configLoading, bootstrapNonce]);

  // Fire analytics after each successful pair match.
  useEffect(() => {
    if (matchedPairs <= prevMatchedPairsRef.current || !sessionId) return;
    prevMatchedPairsRef.current = matchedPairs;
    fireAnalytics('pair_matched', { levelIndex: currentLevelIndex, matchedPairs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevelIndex, matchedPairs, sessionId]);

  // Flush pending moves whenever local pending reaches adaptive per-level batch size.
  useEffect(() => {
    if (!sessionId || pendingMoveVersion === 0) return;

    void (async () => {
      try {
        const pending = await readPending(sessionId, currentLevelIndex);
        if (pending.pendingMoves.length >= saveProgressBatchClicks) {
          await flushPendingMoves(sessionId, currentLevelIndex);
        }
      } catch {
        // keep pending queue for future retry
      }
    })();
  }, [
    currentLevelIndex,
    flushPendingMoves,
    pendingMoveVersion,
    saveProgressBatchClicks,
    sessionId,
  ]);

  // Prefetch next level at 10% match progress for fast level transition
  useEffect(() => {
    if (prefetchFiredRef.current || !sessionId || currentLevelIndex + 1 >= totalLevels) return;
    if (totalPairs === 0 || matchedPairs / totalPairs < 0.1) return;

    prefetchFiredRef.current = true;
    prefetchNextLevel.mutate(sessionId, {
      onSuccess: (data) => preparePrefetchedLevel(data.level),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPairs]);

  // On level transition, signal completion; use response as fallback if prefetch hasn't returned yet
  useEffect(() => {
    if (gameState !== GAME_STATES.LEVEL_TRANSITION || completeBoardFiredRef.current || !sessionId)
      return;
    completeBoardFiredRef.current = true;
    fireAnalytics('level_complete', { levelIndex: currentLevelIndex });

    void (async () => {
      try {
        await flushPendingMoves(sessionId, currentLevelIndex);
      } catch {
        // Keep pending queue in local storage for retry.
      }

      completeBoard.mutate(undefined, {
        onSuccess: (data) => {
          preparePrefetchedLevel(data.currentLevel);
        },
      });
    })();
  }, [
    completeBoard,
    currentLevelIndex,
    fireAnalytics,
    flushPendingMoves,
    gameState,
    preparePrefetchedLevel,
    sessionId,
  ]);

  // Let level-complete confetti finish before replacing the completed board
  // with the next-round progress animation.
  useEffect(() => {
    if (gameState !== GAME_STATES.LEVEL_TRANSITION) return;

    const t = setTimeout(() => {
      setShowRoundTransition(true);
    }, LEVEL_COMPLETE_CELEBRATION_MS);
    return () => clearTimeout(t);
  }, [gameState, currentLevelIndex]);

  // Once the completion celebration and next-round animation finish, load the next level.
  useEffect(() => {
    if (
      gameState !== GAME_STATES.LEVEL_TRANSITION ||
      !prefetchedLevel ||
      !showRoundTransition
    )
      return;

    const t = setTimeout(() => {
      loadNextLevel(prefetchedLevel);
      setPrefetchedLevel(null);
      setShowRoundTransition(false);
      prefetchFiredRef.current = false;
      completeBoardFiredRef.current = false;
      prevMatchedPairsRef.current = 0;
      setPendingMoveVersion(0);
    }, ROUND_TRANSITION_DELAY_MS);
    return () => clearTimeout(t);
  }, [gameState, prefetchedLevel, loadNextLevel, showRoundTransition]);

  // Call game-over API once the game finishes, then navigate to the result screen
  useEffect(() => {
    if (
      gameState !== GAME_STATES.FINISHED ||
      !gameOverStats ||
      gameEndFiredRef.current ||
      !sessionId
    )
      return;
    gameEndFiredRef.current = true;

    fireAnalytics(gameOverStats.result === 'win' ? 'game_won' : 'game_lost', {
      levelsCompleted: gameOverStats.levelsCompleted,
      totalLevels: gameOverStats.totalLevels,
    });

    void (async () => {
      if (gameOverStats.result === 'win') {
        try {
          console.info('[GameplayScreen] winFlow:flushBeforeCompleteBoard:start', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
          await flushPendingMoves(sessionId, currentLevelIndex);
          console.info('[GameplayScreen] winFlow:flushBeforeCompleteBoard:done', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
        } catch {
          // Keep pending queue in local storage for retry.
          console.warn('[GameplayScreen] winFlow:flushBeforeCompleteBoard:failed', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
        }

        try {
          console.info('[GameplayScreen] winFlow:completeBoard:request', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
          await completeBoard.mutateAsync();
          console.info('[GameplayScreen] winFlow:completeBoard:success', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
        } catch {
          // Continue to game-over even if complete-board fails.
          console.warn('[GameplayScreen] winFlow:completeBoard:failed', {
            sessionId,
            levelIndex: currentLevelIndex,
          });
        }
      }

      console.info('[GameplayScreen] winFlow:gameOver:request', {
        sessionId,
        result: gameOverStats.result,
      });
      gameOver.mutate(
        { sessionId },
        {
          onSuccess: (data) => {
            console.info('[GameplayScreen] winFlow:gameOver:success', {
              sessionId,
              finalScore: data.finalScore,
              rank: data.rank,
            });
            clearStoredSessionKeys();
            const finalStats: GameOverStats = {
              ...gameOverStats,
              finalScore: data.finalScore,
              rank: data.rank,
              levelsCompleted: data.roundsCompleted,
              totalLevels: data.totalRounds,
            };
            setTimeout(() => onGameOver(finalStats), 600);
          },
          onError: () => {
            // Navigate even if the API fails — show local stats with zeroed score
            console.warn('[GameplayScreen] winFlow:gameOver:failed', {
              sessionId,
            });
            setTimeout(() => onGameOver(gameOverStats), 600);
          },
        },
      );
    })();
  }, [
    completeBoard,
    currentLevelIndex,
    fireAnalytics,
    flushPendingMoves,
    gameOver,
    gameOverStats,
    gameState,
    onGameOver,
    sessionId,
  ]);

  useEffect(() => {
    if (!startGame.isError || !startGame.error) return;
    showApiError({
      title: t('errors.startFailed'),
      description: getApiErrorMessage(startGame.error, t('game.loadError')),
    });
  }, [startGame.isError, startGame.error, showApiError, t]);

  const handleRetryLoad = () => {
    clearApiError();
    clearStoredSessionKeys();
    startGame.reset();
    initializedRef.current = false;
    setInitError(null);
    setBootstrapNonce((n) => n + 1);
    void refetchConfig();
  };

  const handleCardTapWithAnalytics = (cardId: string) => {
    const card = cards.find((candidate) => candidate.id === cardId);
    const isValidTap = Boolean(
      sessionId &&
      card &&
      !card.isFlipped &&
      !card.isMatched &&
      !isAnimating &&
      gameState === GAME_STATES.PLAYING,
    );

    if (isValidTap && sessionId) {
      const move: MoveEntry = {
        id: cardId,
        clickedAt: new Date().toISOString(),
        moveId: uuidv4(),
      };
      void addPendingMoves(sessionId, currentLevelIndex, [move])
        .then(() => {
          setPendingMoveVersion((value) => value + 1);
        })
        .catch(() => {
          // if local write fails, gameplay continues and next clicks can still persist.
        });
    }

    handleCardTap(cardId);
    fireAnalytics('card_flipped', { cardId });
  };

  const hasBootstrappedGame = Boolean(sessionId) && cards.length > 0;
  const isInitializing =
    configLoading || (!hasBootstrappedGame && !startGame.isError && !initError);
  const shouldShowRoundTransition =
    gameState === GAME_STATES.LEVEL_TRANSITION && showRoundTransition && Boolean(prefetchedLevel);

  if (isInitializing) {
    return <LoadingScreen message={t('game.preparing')} />;
  }

  if (!hasBootstrappedGame && (initError || startGame.isError)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4" style={{ height: '100vh' }}>
        <p className="text-center text-sm text-white/70">{initError ?? t('game.loadError')}</p>
        <button
          type="button"
          className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white"
          onClick={handleRetryLoad}
        >
          {t('app.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="gameplay-screen w-full h-full flex flex-col max-w-[465px] mx-auto py-5 px-4">
        <GameHeader
          timeRemaining={timeRemaining}
          matchedPairs={matchedPairs}
          totalPairs={totalPairs}
          gameState={gameState}
          currentLevelIndex={currentLevelIndex}
          totalLevels={totalLevels}
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
        <RoundTransitionOverlay show={shouldShowRoundTransition} key={`round-transition-${currentLevelIndex}`} />
        <CardGrid
          key={`grid-${currentLevelIndex}`}
          cards={cards}
          columns={currentLevelColumns}
          gameState={gameState}
          isAnimating={isAnimating}
          onCardTap={handleCardTapWithAnalytics}
        />
      </div>
    </div>
  );
}
