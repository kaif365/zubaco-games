'use client';

import { Settings } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { appConfig } from '@/app/config/appConfig';
import { OfflineStatusModal } from '@/components/shared/OfflineStatusModal';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useStageContent } from '@/features/stage-content/hooks/useStageContent';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { moveTile } from '@/lib/sliding-puzzle/board';
import { GameStatus, type DemoLevel } from '@/types/sliding-puzzle';
import { storage } from '@/utils/storage';
import mandalaImage from '@micro-screens/assets/mandala-vector.png';
import {
  GameFailureScreen,
  GameInstructionsScreen,
  GameInstructionsSkeleton,
  GameSuccessScreen,
  STAGE_THEME_COLORS,
  type StageId,
} from '@micro-screens/src';

import { getDemo } from '../api/gameApi';
import { useGameSession } from '../hooks/useGameSession';
import { useSoundSystem } from '../hooks/useSoundSystem';
import '../styles/game.css';

import DemoFlow from './DemoFlow';
import GameBoard from './GameBoard';
import GameEditor from './GameEditor';
import GameTimer from './GameTimer';
import MemorizeOverlay from './MemorizeOverlay';
import RevealOverlay from './RevealOverlay.tsx';
import RoundProgressDots from './RoundProgressDots';
import SoundSettings from './SoundSettings';

type AppScreen = 'start' | 'demo' | 'game';

const GATHER_START_DELAY_MS = 750;
const GATHER_TRANSITION_MS = 550;
const GATHER_SETTLE_MS = 120;
const SCATTER_TRANSITION_MS = 550;
const SCATTER_SETTLE_MS = 200;
const LEVEL_COMPLETE_BURST_MS = 1450;

function buildSolvedPieces(gridX: number, gridY: number): number[] {
  const total = gridX * gridY;
  return Array.from({ length: total }, (_, index) => (index === total - 1 ? -1 : index));
}


function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${String(r)}, ${String(g)}, ${String(b)}`;
}

export default function GameContainer() {
  const { t } = useTranslation();
  const auth = useAuth();
  const game = useGameSession();
  const sound = useSoundSystem();
  const [screen, setScreen] = useState<AppScreen>('start');
  const { isOnline } = useNetworkStatus();
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [demoPrefetchStatus, setDemoPrefetchStatus] = useState<
    'idle' | 'loading' | 'available' | 'unavailable'
  >('idle');
  const [demoLevels, setDemoLevels] = useState<DemoLevel[]>([]);
  const demoPrefetchAttemptedRef = useRef(false);
  const [skeletonMinDurationMet, setSkeletonMinDurationMet] = useState(false);
  const [startErrorDismissed, setStartErrorDismissed] = useState(false);
  const [runtimeErrorDismissed, setRuntimeErrorDismissed] = useState(false);
  const pendingRetryRef = useRef<(() => void) | null>(null);
  const hasAutoResumedRef = useRef(false);
  const prevPhaseRef = useRef(game.phase);
  const levelCompleteBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [levelCompleteBurst, setLevelCompleteBurst] = useState(false);
  const [introShufflePieces, setIntroShufflePieces] = useState<number[] | null>(null);
  const [gatherToCenter, setGatherToCenter] = useState(false);
  const [showBlankImage, setShowBlankImage] = useState(false);

  // Stable ref so the effect never lists startGame as a dependency
  const startGameRef = useRef(game.startGame);
  startGameRef.current = game.startGame;

  // Play success sound when the reveal starts (board solved)
  useEffect(() => {
    if (game.phase === 'revealing' && prevPhaseRef.current !== 'revealing') {
      sound.playSuccess();
      if (levelCompleteBurstTimerRef.current) {
        clearTimeout(levelCompleteBurstTimerRef.current);
      }
      setLevelCompleteBurst(false);
      requestAnimationFrame(() => {
        setLevelCompleteBurst(true);
      });
      levelCompleteBurstTimerRef.current = setTimeout(() => {
        setLevelCompleteBurst(false);
        levelCompleteBurstTimerRef.current = null;
      }, LEVEL_COMPLETE_BURST_MS);
    }
    prevPhaseRef.current = game.phase;
  }, [game.phase, sound]);

  useEffect(() => {
    return () => {
      if (levelCompleteBurstTimerRef.current) {
        clearTimeout(levelCompleteBurstTimerRef.current);
      }
    };
  }, []);

  // Start background music the first time the game leaves idle/error
  const bgStartedRef = useRef(false);
  useEffect(() => {
    if (!bgStartedRef.current && game.phase !== 'idle' && game.phase !== 'error') {
      bgStartedRef.current = true;
      sound.startBackground();
    }
  }, [game.phase, sound]);

  // Tile click with sound: check move validity here to fire the right sound,
  // then delegate to game.handleTileClick for all actual state changes.
  const handleTileClickWithSound = useCallback(
    (slot: number) => {
      if (game.phase === 'playing' && game.boardState) {
        const { pieces } = game.boardState;
        const columns = game.boardState.board.gridSize.x;
        if (pieces[slot] !== -1) {
          const result = moveTile(pieces, slot, columns);
          if (result.moved) {
            sound.playWhoosh();
          } else {
            sound.playWrongStep();
          }
        }
      }
      game.handleTileClick(slot);
    },
    [game, sound],
  );

  // Auto-solve with tap sound
  const autoSolveWithSound = useCallback(() => {
    sound.playTap();
    game.autoSolve();
  }, [game, sound]);

  // Auto-resume a persisted live session on page refresh
  useEffect(() => {
    if (hasAutoResumedRef.current || auth.isLoading || !auth.isAuthenticated) return;
    void (async () => {
      const persisted = await storage.readLiveSession();
      if (!persisted?.token) return;
      hasAutoResumedRef.current = true;
      void startGameRef.current();
    })();
  }, [auth.isAuthenticated, auth.isLoading]);

  // Prefetch demo availability in parallel with stage config APIs
  useEffect(() => {
    if (!auth.isAuthenticated || demoPrefetchAttemptedRef.current) return;
    demoPrefetchAttemptedRef.current = true;
    setDemoPrefetchStatus('loading');
    void (async () => {
      try {
        const envelope = await getDemo();
        const data = envelope.data;
        if (data?.enableDemo !== false) {
          setDemoLevels(data?.levels ?? []);
          setDemoPrefetchStatus('available');
        } else {
          setDemoPrefetchStatus('unavailable');
        }
      } catch {
        setDemoPrefetchStatus('unavailable');
      }
    })();
  }, [auth.isAuthenticated]);

  // 300 ms minimum skeleton display — prevents a jarring flash when APIs resolve fast.
  // Dep on isAuthenticated (not demoPrefetchStatus) so the timer is never cancelled
  // mid-flight by the dep-cleanup when the API resolves.
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const timer = setTimeout(() => {
      setSkeletonMinDurationMet(true);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [auth.isAuthenticated]);

  // Open offline modal when connection drops. Demo is excluded — it is fully local.
  useEffect(() => {
    if (isOnline || screen === 'demo') return;
    setOfflineModalOpen(true);
  }, [isOnline, screen]);

  const handleOfflineRetry = useCallback(async () => {
    if (!navigator.onLine) return; // still offline — modal stays open
    setOfflineModalOpen(false);
    const persisted = await storage.readLiveSession();
    if (persisted?.token) {
      void game.startGame(); // startGame handles session recovery internally
    } else if (pendingRetryRef.current) {
      const refire = pendingRetryRef.current;
      pendingRetryRef.current = null;
      refire();
    } else if (!auth.isAuthenticated) {
      // Auth failed during offline page load — retry so the skeleton resolves
      void auth.authenticate();
    }
    // else: modal closed, start screen visible, user can tap Play Now again
  }, [game, auth]);

  const { contentByStage, isLoading: isStageContentLoading } = useStageContent();
  const stageNo = appConfig.game.stageNo as StageId;
  const theme = STAGE_THEME_COLORS[stageNo];
  const themeVars = {
    '--game-accent': theme.resultAccent,
    '--game-accent-rgb': hexToRgb(theme.resultAccent),
    '--game-eclipse': theme.eclipse,
    '--game-eclipse-rgb': hexToRgb(theme.eclipse),
  } as CSSProperties;

  const { phase, boardState, remainingMs, roundScores, scoreboard, finalStatus, error } = game;
  const startScreenError = error ?? auth.error;
  const shouldShowStartError = Boolean(startScreenError) && !startErrorDismissed;
  const shouldShowRuntimeError = Boolean(error) && !runtimeErrorDismissed;

  useEffect(() => {
    if (phase !== 'shuffle-animation' || !boardState) {
      if (phase !== 'shuffle-animation') {
        setIntroShufflePieces(null);
        setGatherToCenter(false);
        setShowBlankImage(false);
      }
      return;
    }

    const { gridSize } = boardState.board;
    const solvedPieces = buildSolvedPieces(gridSize.x, gridSize.y);
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // Start: tiles at solved positions, no gather override
    setIntroShufflePieces(solvedPieces);
    setGatherToCenter(false);
    setShowBlankImage(true);

    const scatterAt = GATHER_START_DELAY_MS + GATHER_TRANSITION_MS + GATHER_SETTLE_MS;
    const completeAt = scatterAt + SCATTER_TRANSITION_MS + SCATTER_SETTLE_MS;

    timers.push(
      // Phase 1 — all tiles animate to the visual center of the grid
      setTimeout(() => { setGatherToCenter(true); }, GATHER_START_DELAY_MS),
      // Phase 2 — tiles scatter from center to their shuffled positions
      setTimeout(() => { setGatherToCenter(false); setIntroShufflePieces(boardState.pieces); setShowBlankImage(false); }, scatterAt),
      // Phase 3 — animation complete, start playing
      setTimeout(game.onShuffleAnimationComplete, completeAt),
    );

    return () => {
      timers.forEach((timer) => { clearTimeout(timer); });
    };
  }, [boardState, game.onShuffleAnimationComplete, phase]);

  useEffect(() => {
    setStartErrorDismissed(false);
  }, [startScreenError]);

  useEffect(() => {
    setRuntimeErrorDismissed(false);
  }, [error]);

  // ── Demo screen ──────────────────────────────────────────────────────────
  if (screen === 'demo') {
    return (
      <DemoFlow
        stage={stageNo}
        levels={demoLevels}
        onComplete={() => {
          setScreen('start');
        }}
      />
    );
  }
  if (auth.isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#1c1b20' }}
      >
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-10 py-8 text-center backdrop-blur-md">
          <div className="puzzle-loading__spinner" />
          <div className="flex flex-col items-center gap-2">
            <p className="puzzle-loading__text">{t('game.connecting')}</p>
            <p
              className="max-w-[240px] text-xs leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {t('game.connectingNote')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Skeleton — shown while stage content or demo API are still resolving ───
  if (
    screen === 'start' &&
    (phase === 'idle' || phase === 'error') &&
    (isStageContentLoading || demoPrefetchStatus === 'loading' || !skeletonMinDurationMet)
  ) {
    return (
      <div className="relative min-h-[100dvh]" style={themeVars}>
        <GameInstructionsSkeleton stage={stageNo} />
      </div>
    );
  }

  // ── Start / instructions screen ──────────────────────────────────────────
  if (screen === 'start' && (phase === 'idle' || phase === 'error')) {
    return (
      <div className="relative min-h-[100dvh]" style={themeVars}>
        {/* Puzzle editor trigger — floats above the instructions screen (sound settings hidden here) */}
        <div className="absolute top-6 right-6 z-[60] flex items-center gap-2">
          <Dialog>
            <DialogContent
              className="bg-[#0f172a] border-white/10 text-white max-w-md backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
              onPointerDownOutside={(e) => {
                e.preventDefault();
              }}
              onEscapeKeyDown={(e) => {
                e.preventDefault();
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Settings className="h-5 w-5 text-sky-400" />
                  {t('game.puzzleEditor')}
                </DialogTitle>
              </DialogHeader>
              <GameEditor />
            </DialogContent>
          </Dialog>
        </div>

        {/* Auth / game error alert */}
        {shouldShowStartError && (
          <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-[70] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 px-4">
            <Alert
              variant="error"
              title={t('game.connectionLost')}
              description={startScreenError ?? undefined}
              actionLabel={auth.error ? t('game.retryConnection') : undefined}
              onAction={
                auth.error
                  ? () => {
                      void auth.authenticate();
                    }
                  : undefined
              }
              onClose={() => {
                setStartErrorDismissed(true);
              }}
            />
          </div>
        )}

        <GameInstructionsScreen
          stage={stageNo}
          contentByStage={contentByStage}
          hideLearnHowToPlay={demoPrefetchStatus === 'unavailable'}
          onPlayNow={() => {
            if (!navigator.onLine) {
              pendingRetryRef.current = () => {
                void (async () => {
                  sound.startBackground();
                  await auth.authenticate();
                  await game.startGame();
                })();
              };
              return;
            }
            void (async () => {
              sound.startBackground();
              await auth.authenticate();
              await game.startGame();
            })();
          }}
          onLearnHowToPlay={() => {
            setScreen('demo');
          }}
        />
        <OfflineStatusModal
          isOpen={offlineModalOpen}
          stage={stageNo}
          onRetry={() => { void handleOfflineRetry(); }}
        />

      </div>
    );
  }

  // ── Loading / calculating result ─────────────────────────────────────────
  if (phase === 'loading' || phase === 'calculating_result') {
    return (
      <main
        className={`puzzle-shell${levelCompleteBurst ? ' puzzle-shell--level-complete' : ''} flex flex-col h-screen overflow-hidden select-none`}
      >
        <div className="background-layer" style={{ backgroundImage: `url(${mandalaImage})` }} />
        {levelCompleteBurst && <div className="puzzle-level-complete-burst" aria-hidden="true" />}
        <div
          className="puzzle-shell__top-glow"
          style={{
            background: `linear-gradient(${theme.eclipse}, ${theme.eclipse}52)`,
            boxShadow: `0 0 108px ${theme.eclipse}b8`,
          }}
        />
        <div className="relative z-[2] h-[100dvh] flex items-center justify-center">
          <div className="puzzle-loading">
            <div className="puzzle-loading__spinner" />
            <p className="puzzle-loading__text">
              {phase === 'calculating_result' ? t('game.calculatingResult') : t('game.loading')}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Result screen ────────────────────────────────────────────────────────
  if (
    (phase === 'completed' || phase === 'expired') &&
    scoreboard != null &&
    finalStatus !== null
  ) {
    const isSuccess = finalStatus === GameStatus.ENDED;
    const completedGames = scoreboard.rounds.filter((r) => r.score !== null && r.score > 0).length;
    const totalGames = scoreboard.rounds.length;

    if (isSuccess) {
      return (
        <GameSuccessScreen
          stage={stageNo}
          score={scoreboard.totalScore}
          completedGames={completedGames}
          totalGames={totalGames}
          onContinue={() => {
            window.dispatchEvent(new CustomEvent('sliding-puzzle:return-to-menu'));
          }}
        />
      );
    }

    return (
      <GameFailureScreen
        stage={stageNo}
        score={scoreboard.totalScore}
        completedGames={completedGames}
        totalGames={totalGames}
        onContinue={() => {
          window.dispatchEvent(new CustomEvent('sliding-puzzle:return-to-menu'));
        }}
      />
    );
  }

  // ── Active game ──────────────────────────────────────────────────────────
  const board = boardState?.board;
  const pieces = boardState?.pieces;
  const totalRounds = boardState?.totalRounds ?? 0;

  const isMemorizing = phase === 'memorizing';
  const isShuffleAnimation = phase === 'shuffle-animation';
  const isBoardClearing = phase === 'board-clearing' || phase === 'loading-next';
  const isRevealing = phase === 'revealing';
  const solvedPieces = board ? buildSolvedPieces(board.gridSize.x, board.gridSize.y) : null;
  const boardDisplayPieces =
    isMemorizing && solvedPieces
      ? solvedPieces
      : isShuffleAnimation
        ? (introShufflePieces ?? solvedPieces ?? pieces)
        : pieces;

  // Header shows "Level N + timer" only when actively playing
  const isGameActive =
    board != null &&
    phase !== 'idle' &&
    phase !== 'error';

  return (
    <main
      className={`puzzle-shell${levelCompleteBurst ? ' puzzle-shell--level-complete' : ''} flex flex-col h-screen overflow-hidden select-none`}
      style={themeVars}
    >
      <div className="background-layer" style={{ backgroundImage: `url(${mandalaImage})` }} />
      {levelCompleteBurst && <div className="puzzle-level-complete-burst" aria-hidden="true" />}
      <div
        className="puzzle-shell__top-glow"
        style={{
          background: `linear-gradient(${theme.eclipse}, ${theme.eclipse}52)`,
          boxShadow: `0 0 108px ${theme.eclipse}b8`,
        }}
      />

      <div className="relative z-[2] h-[100dvh] flex flex-col justify-between py-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="puzzle-header">
          {isGameActive ? (
            <span className="puzzle-header__level">{t('game.level', { number: board.roundNumber })}</span>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isGameActive && <GameTimer remainingMs={remainingMs} />}
            <SoundSettings sound={sound} />
          </div>
        </header>

        {/* ── Playfield ──────────────────────────────────────────────── */}
        <div className="puzzle-playfield flex-1 relative">
          {/* Board */}
          {board && pieces && (
            /*
             * pb-16 reserves space for the round-progress dots (absolute bottom-28px).
             * The aspect-ratio wrapper owns the grid shape so GameBoard can fill 100%.
             * maxHeight:'100%' prevents portrait-aspect boards from overflowing the
             * playfield and getting clipped — CSS will shrink the width to compensate.
             */
            <div className="absolute inset-0 flex items-center justify-center px-4 pb-16">
              <div
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  aspectRatio: `${String(board.gridSize.x)} / ${String(board.gridSize.y)}`,
                  maxHeight: '100%',
                }}
              >
                <div className="puzzle-board-card" style={{ height: '100%' }}>
                  <GameBoard
                    board={board}
                    pieces={boardDisplayPieces ?? pieces}
                    disabled={
                      isMemorizing ||
                      isShuffleAnimation ||
                      isBoardClearing ||
                      isRevealing
                    }
                    isSolved={isBoardClearing || isRevealing}
                    shuffleMode={isShuffleAnimation}
                    gatherToCenter={gatherToCenter}
                    showBlankImage={showBlankImage}
                    revealMode={isMemorizing}
                    onTileClick={handleTileClickWithSound}
                  />

                  {isMemorizing && (
                    <MemorizeOverlay
                      fullImageUrl={board.fullImageUrl}
                      gridX={board.gridSize.x}
                      gridY={board.gridSize.y}
                      displayTime={board.displayTime}
                      showImage={false}
                      onComplete={game.onMemorizeComplete}
                    />
                  )}

                  {isRevealing && (
                    <RevealOverlay
                      fullImageUrl={board.fullImageUrl}
                      gridX={board.gridSize.x}
                      gridY={board.gridSize.y}
                      onComplete={game.onRevealComplete}
                    />
                  )}

                </div>
              </div>
            </div>
          )}

          {/* Round progress dots */}
          {isGameActive && totalRounds > 0 && (
            <RoundProgressDots
              currentRound={board.roundNumber}
              totalRounds={totalRounds}
              roundScores={roundScores}
            />
          )}
        </div>

        {/* Dev: auto-solve */}
        {appConfig.features.devtools && phase === 'playing' && (
          <div className="puzzle-bottom-bar">
            <button type="button" className="puzzle-btn-ghost" onClick={autoSolveWithSound}>
              Auto Solve
            </button>
          </div>
        )}
      </div>

      {/* Runtime game error alert */}
      {shouldShowRuntimeError && (
        <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-[100] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 px-4">
          <Alert
            variant="error"
            title={t('game.connectionLost')}
            description={error ?? undefined}
            onClose={() => {
              setRuntimeErrorDismissed(true);
            }}
          />
        </div>
      )}
      <OfflineStatusModal
        isOpen={offlineModalOpen}
        stage={stageNo}
        onRetry={() => { void handleOfflineRetry(); }}
      />
    </main>
  );
}
