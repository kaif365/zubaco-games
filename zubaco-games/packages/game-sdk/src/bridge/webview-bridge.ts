// ─── WebView Bridge ─────────────────────────────────────────────
// Handles communication between the game (running in WebView/iframe)
// and the host mobile app (React Native WebView) or web lobby.

export interface ZubacoContext {
  /** JWT access token for API auth */
  token: string;
  /** Active game session ID */
  gameSessionId: string;
  /** Platform identifier */
  platform: 'ios' | 'android' | 'web' | 'mobile';
  /** User ID */
  userId?: string;
  /** Base API URL */
  apiBaseUrl?: string;
  /** Game type identifier */
  gameType?: string;
  /** Stage number (1-7) */
  stage?: number;
}

export type GameEventType =
  | 'GAME_READY'
  | 'GAME_STARTED'
  | 'GAME_COMPLETED'
  | 'GAME_FAILED'
  | 'GAME_ERROR'
  | 'GAME_EXIT'
  | 'GAME_PAUSED'
  | 'GAME_RESUMED'
  | 'SCORE_UPDATE'
  | 'MOVE_SUBMITTED'
  | 'TIME_WARNING';

export interface GameEvent {
  type: GameEventType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

declare global {
  interface Window {
    __ZUBACO__?: ZubacoContext;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

class WebViewBridge {
  private context: ZubacoContext | null = null;
  private listeners: Map<string, Set<(event: GameEvent) => void>> = new Map();
  private ready = false;

  /**
   * Initialize the bridge — reads injected context from mobile app or URL params (web).
   * Call this once at game startup.
   */
  init(): ZubacoContext {
    // Priority 1: Injected by React Native WebView
    if (window.__ZUBACO__) {
      this.context = { ...window.__ZUBACO__ };
    }
    // Priority 2: URL search params (web lobby iframe)
    else {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const gameSessionId = params.get('sessionId') || params.get('gameSessionId');

      if (!token || !gameSessionId) {
        throw new Error('[ZubacoSDK] No context found. Game must be launched via mobile app or web lobby.');
      }

      this.context = {
        token,
        gameSessionId,
        platform: (params.get('platform') as ZubacoContext['platform']) || 'web',
        userId: params.get('userId') || undefined,
        apiBaseUrl: params.get('apiBaseUrl') || undefined,
        gameType: params.get('gameType') || undefined,
        stage: params.get('stage') ? Number(params.get('stage')) : undefined,
      };
    }

    this.ready = true;
    this.emit('GAME_READY', { gameSessionId: this.context.gameSessionId });

    // Listen for messages FROM host
    window.addEventListener('message', this.handleHostMessage);

    return this.context;
  }

  /** Get the current context (throws if not initialized) */
  getContext(): ZubacoContext {
    if (!this.context) {
      throw new Error('[ZubacoSDK] Bridge not initialized. Call bridge.init() first.');
    }
    return this.context;
  }

  /** Check if bridge is initialized */
  isReady(): boolean {
    return this.ready;
  }

  /** Send event to host (mobile app / web lobby) */
  emit(type: GameEventType, payload?: Record<string, unknown>): void {
    const event: GameEvent = { type, payload, timestamp: Date.now() };
    const message = JSON.stringify(event);

    // React Native WebView
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(message);
    }
    // iframe parent (web lobby)
    else if (window.parent !== window) {
      window.parent.postMessage(event, '*');
    }
  }

  /** Notify host that game completed successfully */
  gameCompleted(score: number, metadata?: Record<string, unknown>): void {
    this.emit('GAME_COMPLETED', { score, ...metadata });
  }

  /** Notify host that game failed (time up, max attempts, etc.) */
  gameFailed(reason: string, metadata?: Record<string, unknown>): void {
    this.emit('GAME_FAILED', { reason, ...metadata });
  }

  /** Notify host of an error */
  gameError(error: string, code?: string): void {
    this.emit('GAME_ERROR', { error, code });
  }

  /** Request exit (back button, quit) */
  requestExit(): void {
    this.emit('GAME_EXIT');
  }

  /** Listen for events from host */
  on(type: string, callback: (event: GameEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /** Cleanup — call on unmount */
  destroy(): void {
    window.removeEventListener('message', this.handleHostMessage);
    this.listeners.clear();
    this.ready = false;
  }

  private handleHostMessage = (event: MessageEvent): void => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type) {
        const callbacks = this.listeners.get(data.type);
        callbacks?.forEach((cb) => cb(data as GameEvent));
      }
    } catch {
      // Ignore non-JSON messages
    }
  };
}

/** Singleton bridge instance */
export const bridge = new WebViewBridge();
