import type { GameMove, PersistedLiveSession, PlacedBlock } from '@/types/logic-reflector';
import { appConfig } from '@/app/config/appConfig';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/crypto';

const LIVE_SESSION_KEY = 'lr_live_session';

// Serializes read-modify-write ops so concurrent placements don't clobber each other.
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const pending: Record<string, GameMove[]> = {};
  for (const [level, moves] of Object.entries(value)) {
    if (Array.isArray(moves)) {
      pending[level] = moves.filter(
        (m): m is GameMove =>
          m !== null &&
          typeof m === 'object' &&
          typeof (m as GameMove).moveId === 'string' &&
          typeof (m as GameMove).placedAt === 'string',
      );
    }
  }
  return pending;
}

function normalizeLiveSession(value: unknown): PersistedLiveSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const s = value as Partial<PersistedLiveSession>;
  if (!s.expiryAt || !s.level || !s.totalLevels) return null;

  return {
    token: typeof s.token === 'string' ? s.token : '',
    sessionId: typeof s.sessionId === 'string' ? s.sessionId : null,
    expiryAt: s.expiryAt,
    startedAt: typeof s.startedAt === 'string' ? s.startedAt : null,
    clientStartedAtMs: normalizeFiniteNumber(s.clientStartedAtMs),
    capturedAtMs: normalizeFiniteNumber(s.capturedAtMs),
    totalLevels: s.totalLevels,
    currentLevelNumber: s.currentLevelNumber ?? s.level.levelNumber,
    level: s.level,
    placedBlocks: Array.isArray(s.placedBlocks) ? s.placedBlocks : [],
    phase: 'playing',
    pendingMovesByLevel: normalizePendingMoves(s.pendingMovesByLevel),
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

  // ── Live session ─────────────────────────────────────────────────────────────

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

  // ── Per-move persistence ──────────────────────────────────────────────────────

  appendPendingMove(levelNumber: number, move: GameMove): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      const key = String(levelNumber);
      const existing = session.pendingMovesByLevel[key] ?? [];
      session.pendingMovesByLevel[key] = [...existing, move];
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },

  removePendingMoves(levelNumber: number, submittedIds: Set<string>): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      const key = String(levelNumber);
      const existing = session.pendingMovesByLevel[key] ?? [];
      const remaining = existing.filter((m) => !submittedIds.has(m.moveId));
      const updated = Object.fromEntries(
        Object.entries(session.pendingMovesByLevel).filter(([k]) => k !== key),
      );
      if (remaining.length > 0) updated[key] = remaining;
      session.pendingMovesByLevel = updated;
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },

  updateSessionPlacedBlocks(placedBlocks: PlacedBlock[]): Promise<void> {
    return enqueueMutation(async () => {
      const session = normalizeLiveSession(await this.get<unknown>(LIVE_SESSION_KEY));
      if (!session) return;
      session.placedBlocks = placedBlocks;
      session.capturedAtMs = Date.now();
      await this.set(LIVE_SESSION_KEY, session);
    });
  },
};
