import { useCallback, useEffect, useRef } from 'react';
import type { FlowPuzzleLevel, FlowSessionState } from '@/features/flow-puzzle/types';
import { saveGameProgress } from '@/app/api/gameApi';
import {
  SAVE_PROGRESS_AFTER_COMMITTED_MOVES,
  SAVE_PROGRESS_AFTER_IDLE_MS,
  SAVE_PROGRESS_MIN_FLUSH_INTERVAL_MS,
  SAVE_PROGRESS_MAX_FAILURES,
} from '@/features/flow-puzzle/config/saveProgressConfig';
import type { SaveProgressEnvelope } from '@/features/flow-puzzle/save-progress/saveProgressTypes';
import {
  buildBoardSavePayload,
  buildSaveProgressPathPayloadsForAllColors,
  pathSignature,
} from '@/features/flow-puzzle/save-progress/buildSaveProgressPayload';
import type { SaveProgressOutboxEntry } from '@/features/flow-puzzle/save-progress/saveProgressOutbox';
import {
  dropOutboxByMoveIds,
  enqueueOutbox,
  loadOutbox,
} from '@/features/flow-puzzle/save-progress/saveProgressOutbox';

type FlushReason = 'idle' | 'moveThreshold' | 'preComplete';

function canonicalPathSignature(paths: FlowSessionState['paths']): string {
  const keys = Object.keys(paths).sort();
  return keys.map((key) => `${key}:${JSON.stringify(paths[key] ?? [])}`).join('|');
}

function extractSyncedVersion(envelope: SaveProgressEnvelope): number | undefined {
  const direct = envelope.data?.version;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }
  const nested = envelope.data?.board?.version;
  return typeof nested === 'number' && Number.isFinite(nested) ? nested : undefined;
}

export interface UseSaveGameProgressParams {
  enabled: boolean;
  sessionId: string | undefined;
  sessionBoardId: string | undefined;
  boardVersion: number;
  onBoardVersionSynced?: (version: number) => void;
  level: FlowPuzzleLevel | null;
  session: FlowSessionState | null;
}

export interface UseSaveGameProgressResult {
  /**
   * Runs after all queued saveProgress work (idle / threshold / replay). Flushes this board’s
   * outbox once, then returns the version to pass to `completeBoard` (avoids racing save vs complete).
   */
  drainAutosaveBeforeComplete: () => Promise<number>;
}

export function useSaveGameProgress(params: UseSaveGameProgressParams): UseSaveGameProgressResult {
  const { enabled, sessionId, sessionBoardId, boardVersion, level, session } = params;

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const syncVersionRef = useRef(boardVersion);
  useEffect(() => {
    syncVersionRef.current = boardVersion;
  }, [boardVersion]);

  const lastSyncedSigRef = useRef<string | null>(null);
  const lastSyncedMoveCountRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleUntilRef = useRef(0);
  const failureCountRef = useRef(0);
  const saveHaltedRef = useRef(false);
  const previousPathSignatureByColorRef = useRef<Record<string, string>>({});
  /** `null` until first committed snapshot primed after board load (avoid replaying restores as moves). */
  const committedHydratedBoardRef = useRef<string | null>(null);

  /** Single-file save queue so preComplete never races idle / threshold / replay. */
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueSave = useCallback(<T>(job: () => Promise<T>): Promise<T> => {
    const next = saveQueueRef.current.then(() => job());
    saveQueueRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  useEffect(() => {
    lastSyncedSigRef.current = null;
    lastSyncedMoveCountRef.current = 0;
    previousPathSignatureByColorRef.current = {};
    committedHydratedBoardRef.current = null;
    failureCountRef.current = 0;
    saveHaltedRef.current = false;
  }, [sessionBoardId]);

  useEffect(() => {
    if (!enabled || !sessionId || !sessionBoardId || !level || !session) {
      return;
    }
    if (session.activePath !== null) {
      return;
    }

    const payloads = buildSaveProgressPathPayloadsForAllColors({
      level,
      paths: session.paths,
    });
    const signatureByColor = previousPathSignatureByColorRef.current;

    if (committedHydratedBoardRef.current !== sessionBoardId) {
      committedHydratedBoardRef.current = sessionBoardId;
      for (const payload of payloads) {
        signatureByColor[payload.color] = pathSignature(payload.path);
      }
      return;
    }

    for (const payload of payloads) {
      const signature = pathSignature(payload.path);
      if (signatureByColor[payload.color] === signature) {
        continue;
      }
      signatureByColor[payload.color] = signature;
      enqueueOutbox(sessionId, {
        moveId: payload.moveId,
        color: payload.color,
        pathSignature: signature,
        pathPayload: payload,
        createdAt: Date.now(),
        sessionBoardId,
      });
    }
  }, [enabled, sessionId, sessionBoardId, level, session]);

  const flush = useCallback(
    (reason: FlushReason): Promise<number> =>
      enqueueSave(async () => {
        const {
          enabled: en,
          sessionId: sid,
          sessionBoardId: bid,
          level: lev,
          session: sess,
          onBoardVersionSynced: onSync,
        } = paramsRef.current;

        if (!en || !sid || !bid || !lev || !sess) {
          return syncVersionRef.current;
        }

        if (saveHaltedRef.current) {
          return syncVersionRef.current;
        }

        const signature = canonicalPathSignature(sess.paths);
        if (reason === 'idle' && signature === lastSyncedSigRef.current) {
          return syncVersionRef.current;
        }

        const nowClock = Date.now();
        if (reason !== 'preComplete' && nowClock < throttleUntilRef.current) {
          return syncVersionRef.current;
        }

        const pending = loadOutbox(sid).filter((entry) => entry.sessionBoardId === bid);
        if (pending.length === 0) {
          return syncVersionRef.current;
        }

        const body = {
          sessionId: sid,
          board: buildBoardSavePayload({
            sessionBoardId: bid,
            version: syncVersionRef.current,
            paths: pending.map((item) => item.pathPayload),
          }),
        };

        try {
          const envelope = await saveGameProgress(body);
          dropOutboxByMoveIds(
            sid,
            pending.map((item) => item.moveId),
          );
          throttleUntilRef.current = Date.now() + SAVE_PROGRESS_MIN_FLUSH_INTERVAL_MS;
          lastSyncedSigRef.current = signature;
          lastSyncedMoveCountRef.current = sess.moveCount;
          failureCountRef.current = 0;

          const nextVersion = extractSyncedVersion(envelope);
          if (typeof nextVersion === 'number') {
            syncVersionRef.current = nextVersion;
            onSync?.(nextVersion);
          }
        } catch (err) {
          failureCountRef.current += 1;
          if (failureCountRef.current >= SAVE_PROGRESS_MAX_FAILURES) {
            saveHaltedRef.current = true;
          }
          throttleUntilRef.current = Date.now() + SAVE_PROGRESS_MIN_FLUSH_INTERVAL_MS;
          if (reason === 'preComplete') {
            throw err instanceof Error
              ? err
              : new Error('saveProgress failed before completeBoard');
          }
        }

        return syncVersionRef.current;
      }),
    [enqueueSave],
  );

  const drainAutosaveBeforeComplete = useCallback(async (): Promise<number> => {
    return flush('preComplete');
  }, [flush]);

  /** Retry pending payloads persisted before crashes / failed uploads. */
  useEffect(() => {
    if (!enabled || !sessionId || !sessionBoardId) {
      return;
    }
    const boardId = sessionBoardId;

    const backlog = loadOutbox(sessionId).filter((entry) => entry.sessionBoardId === boardId);
    if (backlog.length === 0) {
      return;
    }

    const latestBacklogByColor: Record<string, SaveProgressOutboxEntry> = {};
    for (const entry of backlog) {
      const existing = latestBacklogByColor[entry.color];
      if (!existing || entry.createdAt >= existing.createdAt) {
        latestBacklogByColor[entry.color] = entry;
      }
    }
    for (const [color, entry] of Object.entries(latestBacklogByColor)) {
      previousPathSignatureByColorRef.current[color] = entry.pathSignature;
    }

    void enqueueSave(async () => {
      if (!sessionId || saveHaltedRef.current) {
        return syncVersionRef.current;
      }
      try {
        const body = {
          sessionId,
          board: buildBoardSavePayload({
            sessionBoardId: boardId,
            version: syncVersionRef.current,
            paths: backlog.map((entry) => entry.pathPayload),
          }),
        };
        const envelope = await saveGameProgress(body);
        dropOutboxByMoveIds(
          sessionId,
          backlog.map((entry) => entry.moveId),
        );
        failureCountRef.current = 0;
        const nextVersion = extractSyncedVersion(envelope);
        if (typeof nextVersion === 'number') {
          syncVersionRef.current = nextVersion;
          paramsRef.current.onBoardVersionSynced?.(nextVersion);
        }
      } catch {
        failureCountRef.current += 1;
        if (failureCountRef.current >= SAVE_PROGRESS_MAX_FAILURES) {
          saveHaltedRef.current = true;
        }
      }
      return syncVersionRef.current;
    });
  }, [enabled, sessionId, sessionBoardId, enqueueSave]);

  useEffect(() => {
    if (!enabled || !sessionId || !sessionBoardId || !level || !session) {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null;
      void flush('idle');
    }, SAVE_PROGRESS_AFTER_IDLE_MS);

    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = null;
    };
  }, [
    enabled,
    sessionId,
    sessionBoardId,
    level,
    session?.paths,
    session?.moveCount,
    session?.activePath,
    flush,
    session,
  ]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }
    const mc = session?.moveCount ?? 0;

    const delta = mc - lastSyncedMoveCountRef.current;
    if (delta < SAVE_PROGRESS_AFTER_COMMITTED_MOVES) {
      return;
    }

    void flush('moveThreshold');
  }, [enabled, session?.moveCount, sessionId, flush]);

  return { drainAutosaveBeforeComplete };
}
