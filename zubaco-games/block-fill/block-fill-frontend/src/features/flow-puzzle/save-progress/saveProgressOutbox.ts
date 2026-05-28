import type { SaveProgressPathPayload } from '@/features/flow-puzzle/save-progress/saveProgressTypes';
import { secureGetItem, secureSetItem, secureRemoveItem } from '@/utils/secureStorage';

export interface SaveProgressOutboxEntry {
  moveId: string;
  pathPayload: SaveProgressPathPayload;
  color: string;
  pathSignature: string;
  createdAt: number;
  /** Board-scoped id — entries without this field (legacy) are treated as non-matching. */
  sessionBoardId: string;
}

export const OUTBOX_STORAGE_KEY = 'block-fill-save-outbox';
const ROOT_KEY = OUTBOX_STORAGE_KEY;
const LEGACY_PREFIX = 'block-fill-save-outbox:';

type SaveProgressOutboxStore = Record<string, SaveProgressOutboxEntry[]>;

/**
 * Returns true when localStorage is accessible (guards SSR / test environments).
 *
 * @returns True when localStorage is available
 */
function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Reads the full outbox store from localStorage, returning an empty object on any failure.
 *
 * @returns The deserialized outbox store
 */
function readStore(): SaveProgressOutboxStore {
  if (!canUseStorage()) {
    return {};
  }
  try {
    const raw = secureGetItem(ROOT_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as SaveProgressOutboxStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persists the full outbox store to localStorage.
 *
 * @param store The store object to serialize and save
 */
function writeStore(store: SaveProgressOutboxStore) {
  if (!canUseStorage()) {
    return;
  }
  secureSetItem(ROOT_KEY, JSON.stringify(store));
}

/**
 * Reads entries stored under the old per-session key format (pre-migration).
 *
 * @param sessionId The session ID used as the legacy localStorage key suffix
 * @returns The stored entries, or an empty array if none found
 */
function readLegacySessionOutbox(sessionId: string): SaveProgressOutboxEntry[] {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(`${LEGACY_PREFIX}${sessionId}`);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SaveProgressOutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Removes the old per-session localStorage key after a successful migration.
 *
 * @param sessionId The session ID whose legacy key should be removed
 */
function cleanupLegacySessionOutbox(sessionId: string) {
  if (!canUseStorage()) {
    return;
  }
  localStorage.removeItem(`${LEGACY_PREFIX}${sessionId}`);
}

/**
 * Loads unsynced outbox entries for a session, migrating from the legacy per-key format if needed.
 *
 * @param sessionId The active session ID to load entries for
 * @returns The current outbox entries for the session
 */
export function loadOutbox(sessionId: string): SaveProgressOutboxEntry[] {
  const store = readStore();
  const current = store[sessionId];
  if (Array.isArray(current)) {
    return current;
  }

  // One-time migration from old multi-key format.
  const legacy = readLegacySessionOutbox(sessionId);
  if (legacy.length === 0) {
    return [];
  }
  store[sessionId] = legacy;
  writeStore(store);
  cleanupLegacySessionOutbox(sessionId);
  return legacy;
}

/**
 * Writes the given entries back to localStorage; removes the session key entirely when the list is empty.
 *
 * @param sessionId The session ID whose entries are being persisted
 * @param entries The entries to store (pass an empty array to clear)
 */
export function persistOutbox(sessionId: string, entries: SaveProgressOutboxEntry[]) {
  const store = readStore();
  if (entries.length === 0) {
    delete store[sessionId];
  } else {
    store[sessionId] = entries;
  }
  if (Object.keys(store).length === 0) {
    if (canUseStorage()) {
      secureRemoveItem(ROOT_KEY);
    }
    return;
  }
  writeStore(store);
}

/**
 * Appends (or replaces by moveId) an entry in the outbox and persists immediately.
 *
 * @param sessionId The active session ID
 * @param entry The outbox entry to add or update
 */
export function enqueueOutbox(sessionId: string, entry: SaveProgressOutboxEntry) {
  const next = loadOutbox(sessionId).filter((e) => e.moveId !== entry.moveId);
  next.push(entry);
  persistOutbox(sessionId, next);
}

/**
 * Removes a single entry from the outbox by its moveId.
 *
 * @param sessionId The active session ID
 * @param moveId The move identifier of the entry to remove
 */
export function dropOutboxByMoveId(sessionId: string, moveId: string) {
  const filtered = loadOutbox(sessionId).filter((e) => e.moveId !== moveId);
  persistOutbox(sessionId, filtered);
}

/**
 * Removes multiple entries from the outbox by their moveIds in a single write.
 *
 * @param sessionId The active session ID
 * @param moveIds The move identifiers of the entries to remove
 */
export function dropOutboxByMoveIds(sessionId: string, moveIds: string[]) {
  const drop = new Set(moveIds);
  const filtered = loadOutbox(sessionId).filter((e) => !drop.has(e.moveId));
  persistOutbox(sessionId, filtered);
}

/**
 * Clears all outbox entries for a session (called after a successful complete-board flush).
 *
 * @param sessionId The session ID to clear
 */
export function clearOutbox(sessionId: string) {
  persistOutbox(sessionId, []);
}
