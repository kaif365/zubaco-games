import type { MoveEntry } from '@/models/game.types';
import { decryptPayload, encryptPayload, isEncryptedPayload } from '@/utils/encryption';

const KEY = 'memory_card_pending';

export interface PendingData {
  sessionId: string;
  levelIndex: number;
  pendingMoves: MoveEntry[];
  pendingTurnedCardIds: string[];
  completeBoardPending: boolean;
}

function getEncryptionKey(): string | null {
  return import.meta.env.VITE_ENCRYPTION_KEY ?? null;
}

async function writePending(data: PendingData): Promise<void> {
  const hexKey = getEncryptionKey();
  if (hexKey) {
    const payload = await encryptPayload(data, hexKey);
    localStorage.setItem(KEY, JSON.stringify(payload));
  } else {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
}

export async function readPending(sessionId: string, levelIndex: number): Promise<PendingData> {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return {
      sessionId,
      levelIndex,
      pendingMoves: [],
      pendingTurnedCardIds: [],
      completeBoardPending: false,
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const hexKey = getEncryptionKey();
    const data: unknown = hexKey && isEncryptedPayload(parsed)
      ? await decryptPayload(parsed, hexKey)
      : parsed;

    if (
      typeof data === 'object' && data !== null &&
      'sessionId' in data &&
      'levelIndex' in data &&
      (data as PendingData).sessionId === sessionId &&
      (data as PendingData).levelIndex === levelIndex
    ) {
      return data as PendingData;
    }
  } catch {
    // corrupt or stale — ignore
  }

  return {
    sessionId,
    levelIndex,
    pendingMoves: [],
    pendingTurnedCardIds: [],
    completeBoardPending: false,
  };
}

export function clearPending(): void {
  localStorage.removeItem(KEY);
}

export async function addPendingMatchedMoves(
  sessionId: string,
  levelIndex: number,
  moves: MoveEntry[],
  cardIds: string[],
): Promise<void> {
  const current = await readPending(sessionId, levelIndex);
  const existingMoveIds = new Set(current.pendingMoves.map((pendingMove) => pendingMove.moveId));
  const newMoves = moves.filter((move) => !existingMoveIds.has(move.moveId));
  const turnedCardIds = new Set([...current.pendingTurnedCardIds, ...cardIds]);
  await writePending({
    ...current,
    sessionId,
    levelIndex,
    pendingMoves: [...current.pendingMoves, ...newMoves],
    pendingTurnedCardIds: [...turnedCardIds],
  });
}

export async function addPendingMoves(
  sessionId: string,
  levelIndex: number,
  moves: MoveEntry[],
): Promise<void> {
  await addPendingMatchedMoves(sessionId, levelIndex, moves, []);
}

export async function removePendingMoves(
  sessionId: string,
  levelIndex: number,
  moveIds: string[],
): Promise<void> {
  const current = await readPending(sessionId, levelIndex);
  const sentMoveIds = new Set(moveIds);
  const remainingMoves = current.pendingMoves.filter((move) => !sentMoveIds.has(move.moveId));
  await writePending({
    ...current,
    pendingMoves: remainingMoves,
    pendingTurnedCardIds: remainingMoves.length > 0 ? current.pendingTurnedCardIds : [],
  });
}

export async function markCompleteBoardPending(
  sessionId: string,
  levelIndex: number,
): Promise<void> {
  const current = await readPending(sessionId, levelIndex);
  await writePending({ ...current, completeBoardPending: true });
}
