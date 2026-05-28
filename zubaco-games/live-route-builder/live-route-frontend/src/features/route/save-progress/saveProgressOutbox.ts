import type { LiveRouteProgressEntry, LiveRouteSavePayload } from './saveProgressTypes';

const STORAGE_KEY = 'live-route-save-progress';
const OUTBOX_KEY = 'live-route-save-outbox';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readProgress(): LiveRouteProgressEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LiveRouteProgressEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeProgress(entries: LiveRouteProgressEntry[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveLevel(entry: LiveRouteProgressEntry): void {
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

export function getProgress(): LiveRouteProgressEntry[] { return readProgress(); }
export function getLevelProgress(levelIndex: number): LiveRouteProgressEntry | undefined { return readProgress().find((e) => e.levelIndex === levelIndex); }
export function getHighestCompletedLevel(): number { const p = readProgress(); return p.length === 0 ? 0 : Math.max(...p.map((e) => e.levelIndex)); }
export function getTotalScore(): number { return readProgress().reduce((sum, e) => sum + e.score, 0); }

function queueForSync(progress: LiveRouteProgressEntry[]): void {
  if (!canUseStorage()) return;
  const payload: LiveRouteSavePayload = {
    progress,
    lastPlayedLevel: Math.max(0, ...progress.map((e) => e.levelIndex)),
    totalScore: progress.reduce((sum, e) => sum + e.score, 0),
    savedAt: Date.now(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload));
}

export function getOutboxPayload(): LiveRouteSavePayload | null {
  if (!canUseStorage()) return null;
  try { const raw = localStorage.getItem(OUTBOX_KEY); if (!raw) return null; return JSON.parse(raw) as LiveRouteSavePayload; } catch { return null; }
}

export function clearOutbox(): void { if (!canUseStorage()) return; localStorage.removeItem(OUTBOX_KEY); }
export function hasUnsyncedProgress(): boolean { return getOutboxPayload() !== null; }
