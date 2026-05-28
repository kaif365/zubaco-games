import type { GameMove, PersistedLiveSession } from '@/types/sliding-puzzle';
import { appConfig } from '@app/config/appConfig';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@utils/crypto';

const LIVE_SESSION_KEY = 'sp_live_session';

// Serializes all read-modify-write ops so concurrent tile clicks don't clobber each other.
let mutationQueue: Promise<void> = Promise.resolve();

function enqueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(mutation, mutation);
  mutationQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function normalizeFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePendingMoves(value: unknown): Record<string, GameMove[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const pending: Record<string, GameMove[]> = {};
  for (const [round, moves] of Object.entries(value)) {
    if (Array.isArray(moves)) {
      pending[round] = moves.filter(
        (move): move is GameMove =>
          move !== null &&
          typeof move === 'object' &&
          typeof (move as GameMove).slot === 'number' &&
          typeof (move as GameMove).clickedAt === 'string' &&
          typeof (move as GameMove).moveId === 'string',
      );
    }
  }
  return pending;
}

function normalizeLiveSession(value: unknown): PersistedLiveSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const session = value as Partial<PersistedLiveSession>;
  if (!session.expiryAt || !session.board || !session.totalRounds) {
    return null;
  }

  const pieces =
    Array.isArray(session.pieces) && session.pieces.length === session.board.pieces.length
      ? session.pieces
      : [...session.board.pieces];
  const phase =
    session.phase === 'playing' || session.phase === 'memorizing'
      ? session.phase
      : session.board.displayTime > 0
        ? 'memorizing'
        : 'playing';

  return {
    token: typeof session.token === 'string' ? session.token : '',
    sessionId: typeof session.sessionId === 'string' ? session.sessionId : null,
    expiryAt: session.expiryAt,
    startedAt: typeof session.startedAt === 'string' ? session.startedAt : null,
    clientStartedAtMs: normalizeFiniteNumber(session.clientStartedAtMs),
    capturedAtMs: normalizeFiniteNumber(session.capturedAtMs),
    totalRounds: session.totalRounds,
    currentRound: session.currentRound ?? session.board.roundNumber,
    board: session.board,
    pieces,
    phase,
    pendingMovesByRound: normalizePendingMoves(session.pendingMovesByRound),
  };
}

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item) as unknown;
      if (isEncryptedPayload(parsed)) {
        return (await decryptPayload(parsed, appConfig.encryption.key)) as T;
      }
      // plain-text fallback for data written before encryption was enabled
      return parsed as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      if (!appConfig.encryption.enabled) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }
      const encrypted = await encryptPayload(value, appConfig.encryption.key);
      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch {
      console.warn(`[storage] Failed to set key "${key}"`);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },

  // ── Live session persistence ─────────────────────────────────────────────

  async readLiveSession(): Promise<PersistedLiveSession | null> {
    return normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
  },

  saveLiveSession(data: PersistedLiveSession): Promise<void> {
    return enqueueMutation(() =>
      this.set(LIVE_SESSION_KEY, { ...data, capturedAtMs: Date.now() }),
    );
  },

  clearLiveSession(): void {
    this.remove(LIVE_SESSION_KEY);
  },

  // ── Per-move persistence (called on every click / successful flush) ───────

  /** Append a single move to the persisted queue for a round. */
  appendPendingMove(roundNumber: number, move: GameMove): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      const key = String(roundNumber);
      const existing = session.pendingMovesByRound[key] ?? [];
      session.pendingMovesByRound[key] = [...existing, move];
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },

  /** Remove successfully submitted moves from the persisted queue. */
  removePendingMoves(roundNumber: number, submittedIds: Set<string>): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      const key = String(roundNumber);
      const existing = session.pendingMovesByRound[key] ?? [];
      const remaining = existing.filter((m) => !submittedIds.has(m.moveId));
      const pendingMovesByRound = Object.fromEntries(
        Object.entries(session.pendingMovesByRound).filter(([round]) => round !== key),
      );
      if (remaining.length > 0) {
        pendingMovesByRound[key] = remaining;
      }
      session.pendingMovesByRound = pendingMovesByRound;
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },

  /** Update the current tile positions after each player move. */
  updateSessionPieces(pieces: number[]): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      session.pieces = pieces;
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },

  /** Update the persisted phase (e.g. memorizing → playing). */
  updateSessionPhase(phase: 'memorizing' | 'playing'): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      session.phase = phase;
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },
};
