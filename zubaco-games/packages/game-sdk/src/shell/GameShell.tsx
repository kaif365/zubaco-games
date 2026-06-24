// ─── Game Shell ─────────────────────────────────────────────────
// Standard game lifecycle wrapper component.
// Handles: init → loading → instructions → playing → result
// Communicates with mobile app via WebView bridge.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { bridge } from '../bridge/webview-bridge';
import type { ZubacoContext } from '../bridge/webview-bridge';
import { createGameApi } from '../api/client';
import type { ApiClientConfig, StartSessionResponse, SubmitResultResponse } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────

export type GamePhase = 'init' | 'loading' | 'instructions' | 'countdown' | 'playing' | 'submitting' | 'result' | 'error';

export interface GameShellProps {
  /** API configuration (baseUrl required) */
  apiConfig: ApiClientConfig;
  /** Game type identifier */
  gameType: string;
  /** Countdown seconds before game starts (default: 3) */
  countdownSeconds?: number;
  /** Whether to show instructions phase (default: true) */
  showInstructions?: boolean;
  /** Render the actual game UI */
  children: (props: GameRenderProps) => React.ReactNode;
  /** Render loading screen (optional) */
  renderLoading?: () => React.ReactNode;
  /** Render instructions screen (optional) */
  renderInstructions?: (props: { onReady: () => void; stage: number; gameType: string }) => React.ReactNode;
  /** Render countdown overlay (optional) */
  renderCountdown?: (seconds: number) => React.ReactNode;
  /** Render result screen (optional) */
  renderResult?: (props: ResultScreenProps) => React.ReactNode;
  /** Render error screen (optional) */
  renderError?: (props: { error: string; retry: () => void }) => React.ReactNode;
}

export interface GameRenderProps {
  /** Current game session from backend */
  session: StartSessionResponse;
  /** Bridge context (token, platform, etc.) */
  context: ZubacoContext;
  /** Game API instance */
  api: ReturnType<typeof createGameApi>;
  /** Call when player completes the game */
  onComplete: (score: number, moves: unknown[], metadata?: Record<string, unknown>) => void;
  /** Call when player fails (time up, max attempts) */
  onFail: (reason: string) => void;
  /** Current phase */
  phase: GamePhase;
}

export interface ResultScreenProps {
  result: SubmitResultResponse;
  session: StartSessionResponse;
  onExit: () => void;
  onPlayAgain?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function GameShell({
  apiConfig,
  gameType,
  countdownSeconds = 3,
  showInstructions = true,
  children,
  renderLoading,
  renderInstructions,
  renderCountdown,
  renderResult,
  renderError,
}: GameShellProps) {
  const [phase, setPhase] = useState<GamePhase>('init');
  const [session, setSession] = useState<StartSessionResponse | null>(null);
  const [context, setContext] = useState<ZubacoContext | null>(null);
  const [result, setResult] = useState<SubmitResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(countdownSeconds);
  const apiRef = useRef<ReturnType<typeof createGameApi> | null>(null);

  // ─── Initialize ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const ctx = bridge.init();
      setContext(ctx);
      apiRef.current = createGameApi({
        ...apiConfig,
        baseUrl: ctx.apiBaseUrl || apiConfig.baseUrl,
      });
      setPhase('loading');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setPhase('error');
    }
  }, [apiConfig]);

  // ─── Start Session ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'loading' || !apiRef.current || !context) return;

    let cancelled = false;

    const start = async () => {
      try {
        const stage = context.stage || 1;
        const sess = await apiRef.current!.startSession(gameType, stage);
        if (cancelled) return;
        setSession(sess);
        bridge.emit('GAME_STARTED', { sessionId: sess.sessionId });
        setPhase(showInstructions ? 'instructions' : 'countdown');
      } catch (err) {
        if (cancelled) return;
        const msg = (err as { message?: string })?.message || 'Failed to start session';
        setError(msg);
        setPhase('error');
        bridge.gameError(msg, 'SESSION_START_FAILED');
      }
    };

    start();
    return () => { cancelled = true; };
  }, [phase, context, gameType, showInstructions]);

  // ─── Countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      setPhase('playing');
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // ─── Instructions Done ──────────────────────────────────────
  const handleInstructionsReady = useCallback(() => {
    setCountdown(countdownSeconds);
    setPhase('countdown');
  }, [countdownSeconds]);

  // ─── Game Complete ──────────────────────────────────────────
  const handleComplete = useCallback(
    async (score: number, moves: unknown[], metadata?: Record<string, unknown>) => {
      if (!session || !apiRef.current) return;
      setPhase('submitting');

      try {
        const res = await apiRef.current.submitResult({
          sessionId: session.sessionId,
          score,
          moves,
          completedAt: Date.now(),
          metadata,
        });
        setResult(res);
        setPhase('result');
        bridge.gameCompleted(res.score, { breakdown: res.breakdown });
      } catch (err) {
        const msg = (err as { message?: string })?.message || 'Failed to submit result';
        setError(msg);
        setPhase('error');
        bridge.gameError(msg, 'SUBMIT_FAILED');
      }
    },
    [session],
  );

  // ─── Game Failed ────────────────────────────────────────────
  const handleFail = useCallback(
    (reason: string) => {
      bridge.gameFailed(reason);
      // Still try to submit with score 0
      if (session && apiRef.current) {
        apiRef.current.submitResult({
          sessionId: session.sessionId,
          score: 0,
          moves: [],
          completedAt: Date.now(),
          metadata: { failReason: reason },
        }).then((res) => {
          setResult(res);
          setPhase('result');
        }).catch(() => {
          setPhase('result');
          setResult({ score: 0, breakdown: { base: 0, timeBonus: 0, penalties: 0, final: 0 } });
        });
      }
    },
    [session],
  );

  // ─── Exit ───────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    bridge.requestExit();
  }, []);

  // ─── Retry ──────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(null);
    setPhase('loading');
  }, []);

  // ─── Listen for host events ─────────────────────────────────
  useEffect(() => {
    const unsub1 = bridge.on('PAUSE_GAME', () => {
      bridge.emit('GAME_PAUSED');
    });
    const unsub2 = bridge.on('RESUME_GAME', () => {
      bridge.emit('GAME_RESUMED');
    });
    const unsub3 = bridge.on('FORCE_EXIT', () => {
      bridge.requestExit();
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // ─── Cleanup ────────────────────────────────────────────────
  useEffect(() => {
    return () => bridge.destroy();
  }, []);

  // ─── Render ─────────────────────────────────────────────────

  if (phase === 'init' || phase === 'loading' || phase === 'submitting') {
    return <>{renderLoading?.() || <DefaultLoading />}</>;
  }

  if (phase === 'error' && error) {
    return <>{renderError?.({ error, retry: handleRetry }) || <DefaultError error={error} retry={handleRetry} />}</>;
  }

  if (phase === 'instructions' && session && context) {
    return (
      <>
        {renderInstructions?.({
          onReady: handleInstructionsReady,
          stage: session.stage,
          gameType,
        }) || <DefaultInstructions onReady={handleInstructionsReady} />}
      </>
    );
  }

  if (phase === 'countdown') {
    return <>{renderCountdown?.(countdown) || <DefaultCountdown seconds={countdown} />}</>;
  }

  if (phase === 'result' && result && session) {
    return (
      <>
        {renderResult?.({ result, session, onExit: handleExit }) || (
          <DefaultResult result={result} onExit={handleExit} />
        )}
      </>
    );
  }

  // Playing phase
  if (phase === 'playing' && session && context && apiRef.current) {
    return (
      <>
        {children({
          session,
          context,
          api: apiRef.current,
          onComplete: handleComplete,
          onFail: handleFail,
          phase,
        })}
      </>
    );
  }

  return null;
}

// ─── Default Screens ──────────────────────────────────────────

function DefaultLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading...</div>
    </div>
  );
}

function DefaultError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', padding: '2rem' }}>
      <div style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>
      <button onClick={retry} style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );
}

function DefaultInstructions({ onReady }: { onReady: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', padding: '2rem' }}>
      <div style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '2rem' }}>Ready to Play?</div>
      <button onClick={onReady} style={{ padding: '1rem 3rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '1.1rem', cursor: 'pointer' }}>
        Start Game
      </button>
    </div>
  );
}

function DefaultCountdown({ seconds }: { seconds: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ color: '#fff', fontSize: '5rem', fontWeight: 'bold' }}>{seconds || 'GO!'}</div>
    </div>
  );
}

function DefaultResult({ result, onExit }: { result: SubmitResultResponse; onExit: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', padding: '2rem' }}>
      <div style={{ color: '#fbbf24', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Game Complete!</div>
      <div style={{ color: '#fff', fontSize: '3rem', fontWeight: 'bold', marginBottom: '2rem' }}>{result.score}</div>
      {result.breakdown && (
        <div style={{ color: '#9ca3af', marginBottom: '2rem', textAlign: 'center' }}>
          <div>Base: {result.breakdown.base}</div>
          <div>Time Bonus: +{result.breakdown.timeBonus}</div>
          {result.breakdown.penalties > 0 && <div style={{ color: '#ef4444' }}>Penalties: -{result.breakdown.penalties}</div>}
        </div>
      )}
      <button onClick={onExit} style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
        Exit
      </button>
    </div>
  );
}
