// ─── API Client ─────────────────────────────────────────────────
// Standardized HTTP client for game ↔ backend communication.
// Uses the WebView bridge for auth token. Supports AES-GCM encryption.

import { bridge } from '../bridge/webview-bridge';
import { encrypt, decrypt } from '../encryption/crypto';

export interface ApiClientConfig {
  /** Base URL for the game backend API */
  baseUrl: string;
  /** Enable AES-GCM payload encryption */
  encrypted?: boolean;
  /** Encryption key (required if encrypted=true) */
  encryptionKey?: string;
  /** Request timeout in ms (default: 15000) */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: number;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  statusCode: number;
}

class GameApiClient {
  private config: Required<Pick<ApiClientConfig, 'baseUrl' | 'timeout'>> & ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 15000,
      encrypted: false,
      ...config,
    };
  }

  /** Update config (e.g., after receiving encryption key from session start) */
  configure(partial: Partial<ApiClientConfig>): void {
    Object.assign(this.config, partial);
  }

  /** GET request */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return this.request<T>('GET', url.toString());
  }

  /** POST request */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    return this.request<T>('POST', url.toString(), body);
  }

  /** PUT request */
  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    return this.request<T>('PUT', url.toString(), body);
  }

  /** PATCH request */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    return this.request<T>('PATCH', url.toString(), body);
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const context = bridge.getContext();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.token}`,
      'X-Game-Session-Id': context.gameSessionId,
      'X-Platform': context.platform,
      ...this.config.headers,
    };

    let processedBody: string | undefined;
    if (body !== undefined) {
      const json = JSON.stringify(body);
      if (this.config.encrypted && this.config.encryptionKey) {
        const encrypted = await encrypt(json, this.config.encryptionKey);
        processedBody = JSON.stringify({ encrypted: true, payload: encrypted });
        headers['X-Encrypted'] = '1';
      } else {
        processedBody = json;
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: processedBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const error: ApiError = {
          success: false,
          message: (errorBody as { message?: string }).message || `HTTP ${response.status}`,
          code: (errorBody as { code?: string }).code,
          statusCode: response.status,
        };
        throw error;
      }

      const responseData = await response.json();

      // Decrypt if response is encrypted
      if (responseData?.encrypted && this.config.encryptionKey) {
        const decrypted = await decrypt(responseData.payload, this.config.encryptionKey);
        return JSON.parse(decrypted) as T;
      }

      // Unwrap standard API response
      if (responseData?.data !== undefined) {
        return responseData.data as T;
      }

      return responseData as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw { success: false, message: 'Request timeout', code: 'TIMEOUT', statusCode: 0 } as ApiError;
      }
      throw err;
    }
  }
}

// ─── Game Session API (standardized endpoints) ──────────────────

export interface StartSessionResponse {
  sessionId: string;
  gameType: string;
  stage: number;
  config: Record<string, unknown>;
  expiresAt: string;
  encryptionKey?: string;
  serverTime: number;
}

export interface SubmitResultResponse {
  score: number;
  rank?: number;
  rewards?: { type: string; amount: number }[];
  penalties?: { type: string; deduction: number; reason: string }[];
  breakdown?: { base: number; timeBonus: number; penalties: number; final: number };
}

export interface TimeSyncResponse {
  serverTime: number;
  sessionExpiresAt: number;
  remainingMs: number;
}

export function createGameApi(config: ApiClientConfig) {
  const client = new GameApiClient(config);

  return {
    client,

    /** Start a game session */
    async startSession(gameType: string, stage: number): Promise<StartSessionResponse> {
      const res = await client.post<StartSessionResponse>('/game/session/start', { gameType, stage });
      // If server provides encryption key, configure client
      if (res.encryptionKey) {
        client.configure({ encrypted: true, encryptionKey: res.encryptionKey });
      }
      return res;
    },

    /** Submit game result */
    async submitResult(payload: {
      sessionId: string;
      score: number;
      moves: unknown[];
      completedAt: number;
      metadata?: Record<string, unknown>;
    }): Promise<SubmitResultResponse> {
      return client.post<SubmitResultResponse>('/game/session/submit', payload);
    },

    /** Sync timer with server */
    async timeSync(sessionId: string): Promise<TimeSyncResponse> {
      return client.get<TimeSyncResponse>('/game/session/time-sync', { sessionId });
    },

    /** Submit a batch of moves */
    async submitMoves(sessionId: string, moves: unknown[]): Promise<{ accepted: number }> {
      return client.post('/game/session/moves', { sessionId, moves });
    },

    /** Get game state (for reconnection) */
    async getState(sessionId: string): Promise<Record<string, unknown>> {
      return client.get(`/game/session/${sessionId}/state`);
    },

    /** Send heartbeat */
    async heartbeat(sessionId: string): Promise<{ alive: boolean }> {
      return client.post('/game/session/heartbeat', { sessionId });
    },
  };
}

export { GameApiClient };
