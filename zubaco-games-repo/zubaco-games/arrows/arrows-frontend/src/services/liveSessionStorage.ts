import type { MoveEntry } from "./gameApiClient";
import type { ServerBoard } from "@/game/gameTypes";
import { storage } from "@/utils/storage";
import { LIVE_SESSION_STORAGE_KEY } from "@/constants/storage";

export type PersistedMoveEntry = MoveEntry & {
  moveId: string;
};

export type PersistedLiveSession = {
  token: string | null;
  stageId: string;
  sessionId: string | null;
  currentRound: number | null;
  totalRounds: number | null;
  startedAt: string | null;
  clientStartedAtMs: number | null;
  expiryAt: string | null;
  capturedAtMs: number | null;
  board: ServerBoard | null;
  phase: "server_game" | "waiting_round" | "calculating_result" | "connecting";
  pendingMovesByRound: Record<string, PersistedMoveEntry[]>;
  removedArrowIdsByRound: Record<string, string[]>;
  lastStatusPayload: unknown | null;
};

function defaultSession(): PersistedLiveSession {
  return {
    token: null,
    stageId: "",
    sessionId: null,
    currentRound: null,
    totalRounds: null,
    startedAt: null,
    clientStartedAtMs: null,
    expiryAt: null,
    capturedAtMs: null,
    board: null,
    phase: "connecting",
    pendingMovesByRound: {},
    removedArrowIdsByRound: {},
    lastStatusPayload: null,
  };
}

function mergeSession(
  current: PersistedLiveSession,
  patch: Partial<PersistedLiveSession>,
): PersistedLiveSession {
  return {
    ...current,
    ...patch,
    pendingMovesByRound:
      patch.pendingMovesByRound ?? current.pendingMovesByRound,
    removedArrowIdsByRound:
      patch.removedArrowIdsByRound ?? current.removedArrowIdsByRound,
  };
}

let mutationQueue = Promise.resolve();

function enqueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(mutation, mutation);
  mutationQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export const liveSessionStorage = {
  async read(): Promise<PersistedLiveSession | null> {
    return storage.get<PersistedLiveSession>(LIVE_SESSION_STORAGE_KEY);
  },

  async write(snapshot: PersistedLiveSession): Promise<void> {
    await enqueueMutation(() =>
      storage.set(LIVE_SESSION_STORAGE_KEY, snapshot),
    );
  },

  async update(
    patch: Partial<PersistedLiveSession>,
  ): Promise<PersistedLiveSession> {
    return enqueueMutation(async () => {
      const next = mergeSession((await this.read()) ?? defaultSession(), patch);
      await storage.set(LIVE_SESSION_STORAGE_KEY, next);
      return next;
    });
  },

  async clear(): Promise<void> {
    await enqueueMutation(async () => {
      storage.remove(LIVE_SESSION_STORAGE_KEY);
    });
  },

  async appendPendingMove(
    roundNumber: number,
    move: PersistedMoveEntry,
  ): Promise<void> {
    await enqueueMutation(async () => {
      const session = (await this.read()) ?? defaultSession();
      const roundKey = String(roundNumber);
      const pendingMovesByRound = {
        ...session.pendingMovesByRound,
        [roundKey]: [...(session.pendingMovesByRound[roundKey] ?? []), move],
      };
      await storage.set(
        LIVE_SESSION_STORAGE_KEY,
        mergeSession(session, { pendingMovesByRound }),
      );
    });
  },

  async removePendingMoves(
    roundNumber: number,
    moveIds: string[],
  ): Promise<void> {
    await enqueueMutation(async () => {
      const session = await this.read();
      if (!session) return;
      const roundKey = String(roundNumber);
      const nextMoves = (session.pendingMovesByRound[roundKey] ?? []).filter(
        (move) => !moveIds.includes(move.moveId),
      );
      const pendingMovesByRound = { ...session.pendingMovesByRound };
      if (nextMoves.length > 0) pendingMovesByRound[roundKey] = nextMoves;
      else delete pendingMovesByRound[roundKey];
      await storage.set(
        LIVE_SESSION_STORAGE_KEY,
        mergeSession(session, { pendingMovesByRound }),
      );
    });
  },

  async replacePendingMoves(
    roundNumber: number,
    moves: PersistedMoveEntry[],
  ): Promise<void> {
    await enqueueMutation(async () => {
      const session = (await this.read()) ?? defaultSession();
      const roundKey = String(roundNumber);
      const pendingMovesByRound = { ...session.pendingMovesByRound };
      if (moves.length > 0) pendingMovesByRound[roundKey] = moves;
      else delete pendingMovesByRound[roundKey];
      await storage.set(
        LIVE_SESSION_STORAGE_KEY,
        mergeSession(session, { pendingMovesByRound }),
      );
    });
  },

  async addRemovedArrow(roundNumber: number, arrowId: string): Promise<void> {
    await enqueueMutation(async () => {
      const session = (await this.read()) ?? defaultSession();
      const roundKey = String(roundNumber);
      const nextSet = new Set(session.removedArrowIdsByRound[roundKey] ?? []);
      nextSet.add(arrowId);
      const removedArrowIdsByRound = {
        ...session.removedArrowIdsByRound,
        [roundKey]: Array.from(nextSet),
      };
      await storage.set(
        LIVE_SESSION_STORAGE_KEY,
        mergeSession(session, { removedArrowIdsByRound }),
      );
    });
  },

  async clearRound(roundNumber: number): Promise<void> {
    await enqueueMutation(async () => {
      const session = await this.read();
      if (!session) return;
      const roundKey = String(roundNumber);
      const pendingMovesByRound = { ...session.pendingMovesByRound };
      const removedArrowIdsByRound = { ...session.removedArrowIdsByRound };
      delete pendingMovesByRound[roundKey];
      delete removedArrowIdsByRound[roundKey];
      await storage.set(
        LIVE_SESSION_STORAGE_KEY,
        mergeSession(session, { pendingMovesByRound, removedArrowIdsByRound }),
      );
    });
  },
};
