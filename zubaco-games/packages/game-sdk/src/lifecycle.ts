// ─── Game Lifecycle Signals ─────────────────────────────────────
// Lightweight utility for games to signal completion/failure to the host app.
// Can be used standalone (without the full SDK GameShell).
//
// Usage:
//   import { signalGameCompleted, signalGameFailed } from '@zubaco/game-sdk/lifecycle';
//   signalGameCompleted(score, { level: 3, timeMs: 45000 });

type EmitFn = (type: string, payload?: Record<string, unknown>) => void;

function getEmit(): EmitFn {
  // Use the globally registered emitter from bootstrap
  if ((window as any).__ZUBACO_EMIT__) {
    return (window as any).__ZUBACO_EMIT__;
  }

  // Fallback: create an emitter on the fly
  return (type: string, payload?: Record<string, unknown>) => {
    const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(msg);
    } else if (window.parent !== window) {
      window.parent.postMessage({ type, payload, timestamp: Date.now() }, '*');
    }
  };
}

/** Signal to host that the game was completed successfully */
export function signalGameCompleted(score: number, metadata?: Record<string, unknown>): void {
  getEmit()('GAME_COMPLETED', { score, ...metadata });
}

/** Signal to host that the game failed (time up, max attempts reached) */
export function signalGameFailed(reason: string, metadata?: Record<string, unknown>): void {
  getEmit()('GAME_FAILED', { reason, ...metadata });
}

/** Signal a game error to the host */
export function signalGameError(error: string, code?: string): void {
  getEmit()('GAME_ERROR', { error, code });
}

/** Request exit from the host app */
export function signalGameExit(): void {
  getEmit()('GAME_EXIT');
}

/** Signal a score update (for live score display in host) */
export function signalScoreUpdate(score: number): void {
  getEmit()('SCORE_UPDATE', { score });
}

/** Signal that game is paused */
export function signalGamePaused(): void {
  getEmit()('GAME_PAUSED');
}

/** Signal that game is resumed */
export function signalGameResumed(): void {
  getEmit()('GAME_RESUMED');
}
