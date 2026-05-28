import type { ArrowsProgressEntry, ArrowsSavePayload } from './saveProgressTypes';

const STORAGE_KEY = 'arrows-save-progress';
const OUTBOX_KEY = 'arrows-save-outbox';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readProgress(): ArrowsProgressEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArrowsProgressEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProgress(entries: ArrowsProgressEntry[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveLevel(entry: ArrowsProgressEntry): void {
  const progress = readProgress();
  const existingIdx = progress.findIndex((e) => e.levelIndex === entry.levelIndex);
  if (existingIdx >= 0) {
    // Keep best score
    if (entry.score > progress[existingIdx].score) {
      progress[existingIdx] = entry;
    }
  } else {
    progress.push(entry);
  }
  writeProgress(progress);
  queueForSync(progress);
}

export function getProgress(): ArrowsProgressEntry[] {
  return readProgress();
}

export function getLevelProgress(levelIndex: number): ArrowsProgressEntry | undefined {
  return readProgress().find((e) => e.levelIndex === levelIndex);
}

export function getHighestCompletedLevel(): number {
  const progress = readProgress();
  if (progress.length === 0) return 0;
  return Math.max(...progress.map((e) => e.levelIndex));
}

export function getTotalScore(): number {
  return readProgress().reduce((sum, e) => sum + e.score, 0);
}

// === Outbox (offline sync queue) ===

function queueForSync(progress: ArrowsProgressEntry[]): void {
  if (!canUseStorage()) return;
  const payload: ArrowsSavePayload = {
    progress,
    lastPlayedLevel: Math.max(0, ...progress.map((e) => e.levelIndex)),
    totalScore: progress.reduce((sum, e) => sum + e.score, 0),
    savedAt: Date.now(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload));
}

export function getOutboxPayload(): ArrowsSavePayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ArrowsSavePayload;
  } catch {
    return null;
  }
}

export function clearOutbox(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(OUTBOX_KEY);
}

export function hasUnsyncedProgress(): boolean {
  return getOutboxPayload() !== null;
}
