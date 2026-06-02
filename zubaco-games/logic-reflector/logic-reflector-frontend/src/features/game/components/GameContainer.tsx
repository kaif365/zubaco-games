import { useRef, useState, useCallback, useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useStageContent } from '@/features/stage-content/hooks/useStageContent';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAudio } from '@/hooks/useAudio';
import { GameStatus } from '@/types/logic-reflector';
import type { BlockType, GameLevel } from '@/types/logic-reflector';
import { storage } from '@/utils/storage';
import { getDemo } from '../api/gameApi';
import { useGameSession } from '../hooks/useGameSession';
import { DemoFlow } from './DemoFlow';
import { GameBoard } from './GameBoard';
import { Toolbar } from './Toolbar';
import { GameInstructionsScreen } from '@/micro-screens/GameInstructionsScreen';
import { GameInstructionsSkeleton } from '@/micro-screens/GameInstructionsSkeleton';
import { GameSuccessScreen, GameFailureScreen } from '@/micro-screens/GameResultScreen';
import { STAGE_THEME_COLORS, type StageId } from '@/micro-screens/theme/colors';
import { OfflineStatusModal } from '@/components/shared/OfflineStatusModal';
import { Alert } from '@/components/ui/alert';
import './game-container.css';

// ── Theme helpers ─────────────────────────────────────────────────────────────

function rgbString(hex: string): string {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(', ');
}

/**
 * Sets CSS vars on the shell element — drives the eclipse glow and accent.
 * Shell background is always near-black (#1c1b20) via CSS; stage only
 * controls the glow colour, accent colour, and win-card bg.
 */
function buildGameThemeStyle(stage: StageId): CSSProperties {
  const t = STAGE_THEME_COLORS[stage];
  return {
    '--game-bg': t.background,
    '--game-bg-rgb': rgbString(t.background),
    '--game-eclipse': t.eclipse,
    '--game-eclipse-rgb': rgbString(t.eclipse),
    '--game-accent': t.resultAccent,
    '--game-accent-rgb': rgbString(t.resultAccent),
  } as CSSProperties;
}

// ── Clock SVG ─────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      className="timer-badge__icon"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="15"
      viewBox="0 0 13 15"
      fill="none"
    >
      <path
        d="M6.44767 5.78274V8.44147L8.10938 9.4385M6.44767 2.79166C3.32736 2.79166 0.797852 5.32117 0.797852 8.44147C0.797852 11.5618 3.32736 14.0913 6.44767 14.0913C9.56797 14.0913 12.0975 11.5618 12.0975 8.44147C12.0975 5.32117 9.56797 2.79166 6.44767 2.79166ZM6.44767 2.79166V0.797607M5.1183 0.797607H7.77703M11.9838 3.18518L10.9868 2.18815L11.4853 2.68667M0.911526 3.18518L1.90855 2.18815L1.41004 2.68667"
        stroke="#fff"
        strokeWidth="1.59524"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GameContainerProps {
  /** 1–7 — controls eclipse glow colour, accent colour and win-card bg */
  stage: StageId;
}

type AppScreen = 'start' | 'demo';
type DemoPrefetchStatus = 'idle' | 'loading' | 'available' | 'unavailable';

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameContainer({ stage }: GameContainerProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const game = useGameSession();
  const { contentByStage, isLoading: isStageContentLoading } = useStageContent();
  const { isOnline } = useNetworkStatus();
  const { play } = useAudio();
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const pendingRetryRef = useRef<(() => void) | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const [skeletonMinDurationMet, setSkeletonMinDurationMet] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('start');
  const [demoPrefetchStatus, setDemoPrefetchStatus] = useState<DemoPrefetchStatus>('idle');
  const [demoBoards, setDemoBoards] = useState<GameLevel[]>([]);
  // True until we've confirmed whether a live session exists to restore.
  // Keeps the skeleton up so the instruction screen never flashes on refresh.
  const [isRecoveryCheckPending, setIsRecoveryCheckPending] = useState(true);
  // True while a session is being auto-resumed (found token → startGame in-flight).
  const [isAutoResuming, setIsAutoResuming] = useState(false);

  // 300 ms minimum skeleton display — prevents a jarring flash when APIs resolve fast.
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const timer = setTimeout(() => setSkeletonMinDurationMet(true), 300);
    return () => clearTimeout(timer);
  }, [auth.isAuthenticated]);

  const hasAutoResumedRef = useRef(false);
  const startGameRef = useRef(game.startGame);
  const demoPrefetchAttemptedRef = useRef(false);

  // Toolbar drag ghost state — must be declared before any early returns
  const [toolbarGhost, setToolbarGhost] = useState<{
    blockType: BlockType;
    x: number;
    y: number;
  } | null>(null);

  // Stable ref to handleDrop to avoid stale closures in callbacks
  const handleDropRef = useRef(game.handleDrop);

  useEffect(() => {
    startGameRef.current = game.startGame;
  }, [game.startGame]);

  useEffect(() => {
    handleDropRef.current = game.handleDrop;
  }, [game.handleDrop]);

  useEffect(() => {
    if (!auth.isAuthenticated || demoPrefetchAttemptedRef.current) return;
    demoPrefetchAttemptedRef.current = true;
    setDemoPrefetchStatus('loading');

    void (async () => {
      try {
        const envelope = await getDemo();
        const data = envelope.data;
        if (envelope.success && data?.enableDemo !== false) {
          setDemoBoards(data?.boards ?? []);
          setDemoPrefetchStatus('available');
        } else {
          setDemoPrefetchStatus('unavailable');
        }
      } catch {
        setDemoPrefetchStatus('unavailable');
      }
    })();
  }, [auth.isAuthenticated]);

  const handleBlockDragMove = useCallback((blockType: BlockType, x: number, y: number) => {
    setToolbarGhost({ blockType, x, y });
  }, []);

  const handleBlockDragEnd = useCallback((blockType: BlockType, x: number, y: number) => {
    setToolbarGhost(null);
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const row = (el as HTMLElement).dataset.row;
      const col = (el as HTMLElement).dataset.col;
      if (row !== undefined && col !== undefined) {
        handleDropRef.current(parseInt(row), parseInt(col), blockType, -1, -1);
        break;
      }
    }
  }, []);

  const handleBlockDragCancel = useCallback(() => {
    setToolbarGhost(null);
  }, []);

  useEffect(() => {
    if (auth.isLoading) return;
    // Auth failed — unblock recovery so we don't hang on skeleton forever.
    if (!auth.isAuthenticated) {
      setIsRecoveryCheckPending(false);
      return;
    }
    if (hasAutoResumedRef.current) return;
    hasAutoResumedRef.current = true;
    void (async () => {
      try {
        const persisted = await storage.readLiveSession();
        if (persisted?.token) {
          setIsAutoResuming(true);
          void startGameRef.current();
        }
      } finally {
        setIsRecoveryCheckPending(false);
      }
    })();
  }, [auth.isAuthenticated, auth.isLoading]);

  // Open offline modal when connection drops.
  useEffect(() => {
    if (isOnline) return;
    const timer = setTimeout(() => setOfflineModalOpen(true), 0);
    return () => clearTimeout(timer);
  }, [isOnline]);

  const handleOfflineRetry = useCallback(async () => {
    if (!navigator.onLine) return; // still offline — modal stays open
    setOfflineModalOpen(false);
    const persisted = await storage.readLiveSession();
    if (persisted?.token) {
      void game.startGame();
    } else if (pendingRetryRef.current) {
      const refire = pendingRetryRef.current;
      pendingRetryRef.current = null;
      refire();
    } else if (!auth.isAuthenticated) {
      void auth.authenticate();
    }
  }, [game, auth]);

  const {
    phase,
    boardState,
    levelScores,
    scoreboard,
    finalStatus,
    error,
    selectedBlock,
    availableBlockCounts,
    timerSeconds,
  } = game;

  // Once the game transitions past loading, the auto-resume is complete.
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'loading') {
      setIsAutoResuming(false);
    }
  }, [phase]);

  // Reset dismissal whenever a new error arrives (must be after `error` is declared).
  useEffect(() => { setErrorDismissed(false); }, [error, auth.error]);

  // Audio: game start
  useEffect(() => {
    if (phase === 'playing') play('start');
  }, [phase]);

  // Audio: level cleared
  useEffect(() => {
    if (phase === 'level-clearing') play('correct');
  }, [phase]);

  // Audio: game complete
  useEffect(() => {
    if (phase === 'completed') play('complete');
  }, [phase]);

  // Audio: timer countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timerSeconds <= 15 && timerSeconds > 0) play('countdown');
  }, [phase, timerSeconds]);

  // ── Auth loading — full-screen spinner while dev-session token is fetched ──
  if (auth.isLoading) {
    return (
      <main className="lr-game-shell select-none" style={buildGameThemeStyle(stage)}>
        <div className="gradient-layer-top" />
        <div className="h-[100dvh] flex items-center justify-center">
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
      </main>
    );
  }

  // ── Auto-resume loading — found a live session, game is restoring ──────────
  // Show the themed game shell with a centred spinner (same style as the
  // in-game shell-loading-state) so there is no flash of the instruction screen.
  if (isAutoResuming) {
    return (
      <main className="lr-game-shell select-none" style={buildGameThemeStyle(stage)}>
        <div className="gradient-layer-top" />
        <div className="h-[100dvh] flex items-center justify-center">
          <div className="shell-loading-state">
            <div className="shell-loading-spinner" />
            <p className="shell-loading-text">{t('game.starting')}</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Skeleton — shown while:
  //   • recovery check is pending (don't know yet if there's a session to restore)
  //   • stage content / demo APIs are still resolving
  if (
    isRecoveryCheckPending ||
    ((phase === 'idle' || phase === 'error') &&
      (isStageContentLoading || !skeletonMinDurationMet || demoPrefetchStatus === 'loading'))
  ) {
    return (
      <main className="lr-game-shell select-none">
        <GameInstructionsSkeleton stage={stage} />
      </main>
    );
  }

  if (screen === 'demo') {
    return <DemoFlow stage={stage} boards={demoBoards} onComplete={() => setScreen('start')} />;
  }

  /*
   * Idle / error / loading — all show the instructions screen.
   * During 'loading' (after Play Now is tapped) the screen stays up and the
   * Play Now button switches to a loading spinner — no separate loader screen
   * between clicking and game start.
   */
  if (phase === 'idle' || phase === 'error' || phase === 'loading') {
    return (
      <main className="lr-game-shell select-none">
        <GameInstructionsScreen
          stage={stage}
          contentByStage={contentByStage}
          onPlayNow={() => {
            if (!navigator.onLine) {
              pendingRetryRef.current = () => {
                void (async () => {
                  await auth.authenticate();
                  await game.startGame();
                })();
              };
              setOfflineModalOpen(true);
              return;
            }
            void (async () => {
              await auth.authenticate();
              await game.startGame();
            })();
          }}
          isPlayNowLoading={phase === 'loading'}
          onLearnHowToPlay={() => setScreen('demo')}
          hideLearnHowToPlay={demoPrefetchStatus === 'unavailable'}
        />
        <OfflineStatusModal
          isOpen={offlineModalOpen}
          stage={stage}
          onRetry={() => {
            void handleOfflineRetry();
          }}
        />
        {(error ?? auth.error) && !errorDismissed && (
          <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-[100] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2">
            <Alert
              variant="error"
              title={t('errors.connectionLost')}
              description={error ?? auth.error ?? undefined}
              onClose={() => setErrorDismissed(true)}
            />
          </div>
        )}
      </main>
    );
  }

  // ── Calculating results — shell stays up, spinner in playfield ──────────────
  const isShellLoading = phase === 'calculating_result';
  const shellLoadingText = t('game.calculatingResult');

  // ── Result screen ───────────────────────────────────────────────────────────
  // Show for ENDED (success), MANUALLY_ENDED (forfeit), and EXPIRED (time's up).
  // scoreboard may be null for edge cases — fall back to accumulated levelScores.
  if (phase === 'completed' && finalStatus !== null) {
    const isSuccess = finalStatus === GameStatus.ENDED;
    const isExpired = finalStatus === GameStatus.EXPIRED;
    const ResultScreen = isSuccess ? GameSuccessScreen : GameFailureScreen;

    const score = scoreboard?.totalScore ?? 0;
    const completed = scoreboard
      ? scoreboard.levels.filter((l) => (l.score ?? 0) > 0).length
      : levelScores.filter((s) => (s.score ?? 0) > 0).length;
    const total = boardState?.totalLevels ?? scoreboard?.levels.length ?? 1;

    return (
      <div className="fixed inset-0">
        <ResultScreen
          stage={stage}
          score={score}
          completedGames={completed}
          totalGames={total}
          isTimeUp={isExpired}
          onContinue={() => {
            globalThis.location.reload();
          }}
        />
      </div>
    );
  }

  // ── Shared shell render (loading, calculating, playing, transitions) ──
  const board = boardState;
  const isOpening = phase === 'level-opening';
  const isClosing = phase === 'loading-next';
  const isSolving = phase === 'level-clearing';
  const isRunning = phase === 'playing';
  const isActiveGame = board !== null && !isShellLoading;
  const showRoundDots = isActiveGame && (isRunning || isOpening || isSolving || isClosing);
  const boardTransitionState = isOpening
    ? 'opening'
    : isClosing
      ? 'closing'
      : isSolving
        ? 'solved'
        : 'idle';

  const timerDisplay = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
  const timerUrgent = timerSeconds > 0 && timerSeconds <= 15;
  const displayTimer = isRunning || isOpening || isSolving || isClosing ? timerDisplay : null;

  return (
    <main className="lr-game-shell select-none" style={buildGameThemeStyle(stage)}>
      {/* Eclipse glow — always visible, sits outside the layout wrapper */}
      <div className="gradient-layer-top" />

      {/*
       * Inner layout wrapper — h-[100dvh] flex flex-col justify-between py-5
       * Shell is ALWAYS rendered; loading states appear as overlays inside
       * the playfield rather than replacing the whole screen.
       */}
      <div className="h-[100dvh] flex flex-col justify-between py-5">
        {/* ── Header — empty during loading ── */}
        <header className="lr-game-header flex-shrink-0 relative flex items-center justify-center">
          {isActiveGame && (
            <>
              {/* Left — level label */}
              <div className="font-semibold text-[16px] md:text-[18px] tracking-[1px] md:uppercase md:tracking-[0.16em] text-white">
                {t('game.level', { number: board.level.levelNumber })}
              </div>

              {/* Right — timer pill */}
              <div className="flex gap-3">
                <div className="lr-game-header-inner">
                  <div className="timer-badge">
                    <div className="timer-badge__content">
                      <span
                        className={[
                          'timer-badge__text flex items-center gap-[7px]',
                          timerUrgent ? 'timer-badge__text--urgent' : '',
                          isRunning ? 'timer-badge__text--running' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <ClockIcon />
                        <span
                          className={[
                            'timer-badge__value',
                            displayTimer ? 'timer-badge__value--clock' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-label={displayTimer ? `Time remaining: ${displayTimer}` : undefined}
                          aria-live="polite"
                        >
                          {displayTimer ?? timerDisplay}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {/* ── Playfield ── fills all space between header and controls ── */}
        <div className="lr-playfield relative flex items-center justify-center px-4 py-2">
          {/* Loading / calculating spinner — shown inside the playfield */}
          {isShellLoading && (
            <div className="shell-loading-state">
              <div className="shell-loading-spinner" />
              {shellLoadingText && <p className="shell-loading-text">{shellLoadingText}</p>}
            </div>
          )}

          {/* Game board — only when there is an active board */}
          {isActiveGame && (
            <GameBoard
              level={board.level}
              placedBlocks={board.placedBlocks}
              litTargetKeys={board.litTargetKeys}
              selectedBlock={selectedBlock}
              disabled={!isRunning}
              transitionState={boardTransitionState}
              onCellClick={game.handleCellClick}
              onCellRemove={game.handleCellRemove}
              onCellDrop={game.handleDrop}
            />
          )}

          {/* Round progress dots — absolute bottom inside playfield */}
          {showRoundDots && (
            <div className="round-progress-dots" aria-label="Level progress">
              {Array.from({ length: board!.totalLevels }, (_, i) => {
                const lvn = i + 1;
                const done = levelScores.some((s) => s.levelNumber === lvn);
                const active = lvn === board!.level.levelNumber;
                return (
                  <span
                    key={lvn}
                    className={['round-progress-dot', done ? 'complete' : active ? 'current' : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Toolbar — div always rendered so layout height never shifts ── */}
        <div className="lr-game-controls flex-shrink-0 flex items-center justify-center gap-3">
          {isActiveGame && phase === 'playing' && (
            <Toolbar
              availableBlocks={board.level.availableBlocks ?? []}
              blockCounts={availableBlockCounts}
              selected={selectedBlock}
              onSelect={game.selectBlock}
              onBlockDragMove={handleBlockDragMove}
              onBlockDragEnd={handleBlockDragEnd}
              onBlockDragCancel={handleBlockDragCancel}
            />
          )}
        </div>
      </div>

      <OfflineStatusModal
        isOpen={offlineModalOpen}
        stage={stage}
        onRetry={() => {
          void handleOfflineRetry();
        }}
      />

      {/* Error alert — all phases, dismissible */}
      {(error ?? auth.error) && !errorDismissed && (
        <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-[100] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2">
          <Alert
            variant="error"
            title={t('errors.connectionLost')}
            description={error ?? auth.error ?? undefined}
            onClose={() => setErrorDismissed(true)}
          />
        </div>
      )}

      {/* Toolbar drag ghost */}
      {toolbarGhost && (
        <div
          style={{
            position: 'fixed',
            left: toolbarGhost.x,
            top: toolbarGhost.y,
            width: 48,
            height: 48,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.85,
            borderRadius: 10,
            background:
              'radial-gradient(circle at 35% 35%, rgba(80,80,100,0.95), rgba(20,20,35,0.98))',
            border: '1px solid rgba(160,140,255,0.55)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </main>
  );
}
