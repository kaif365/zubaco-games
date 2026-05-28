import type { MemoryGroupsProgressEntry, MemoryGroupsSavePayload } from './saveProgressTypes';

const STORAGE_KEY = 'memory-groups-save-progress';
const OUTBOX_KEY = 'memory-groups-save-outbox';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readProgress(): MemoryGroupsProgressEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemoryGroupsProgressEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeProgress(entries: MemoryGroupsProgressEntry[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveLevel(entry: MemoryGroupsProgressEntry): void {
  const progress = readProgress();
  const idx = progress.findIndex((e) => e.levelIndex === entry.levelIndex);
  if (idx >= 0) {
    if (entry.score > progress[idx].score) progress[idx] = entry;
  } else {
    progress.push(entry);
  }
  writeProgress(progress);
  queueForSync(progress);
}

export function getProgress(): MemoryGroupsProgressEntry[] { return readProgress(); }
export function getLevelProgress(levelIndex: number): MemoryGroupsProgressEntry | undefined { return readProgress().find((e) => e.levelIndex === levelIndex); }
export function getHighestCompletedLevel(): number { const p = readProgress(); return p.length === 0 ? 0 : Math.max(...p.map((e) => e.levelIndex)); }
export function getTotalScore(): number { return readProgress().reduce((sum, e) => sum + e.score, 0); }

function queueForSync(progress: MemoryGroupsProgressEntry[]): void {
  if (!canUseStorage()) return;
  const payload: MemoryGroupsSavePayload = {
    progress,
    lastPlayedLevel: Math.max(0, ...progress.map((e) => e.levelIndex)),
    totalScore: progress.reduce((sum, e) => sum + e.score, 0),
    savedAt: Date.now(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload));
}

export function getOutboxPayload(): MemoryGroupsSavePayload | null {
  if (!canUseStorage()) return null;
  try { const raw = localStorage.getItem(OUTBOX_KEY); if (!raw) return null; return JSON.parse(raw) as MemoryGroupsSavePayload; } catch { return null; }
}

export function clearOutbox(): void { if (!canUseStorage()) return; localStorage.removeItem(OUTBOX_KEY); }
export function hasUnsyncedProgress(): boolean { return getOutboxPayload() !== null; }
