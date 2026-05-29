const fs = require('fs');
const path = require('path');

const base = 'C:\\game\\zubaco-games-repo\\zubaco-games';

const games = [
  { dir: 'flash-spot/flash-spot-frontend', feature: 'flash-spot', key: 'flash-spot' },
  { dir: 'Infinity-loop/infinity-loop-frontend', feature: 'infinity-loop', key: 'infinity-loop' },
  { dir: 'live-route-builder/live-route-frontend', feature: 'live-route', key: 'live-route' },
  { dir: 'logic-reflector/logic-reflector-frontend', feature: 'logic-reflector', key: 'logic-reflector' },
  { dir: 'maze-navigation/maze-navigation-frontend', feature: 'maze-navigation', key: 'maze-navigation' },
  { dir: 'memory-card-matching/memory-card-matching-frontend', feature: 'memory-card', key: 'memory-card' },
  { dir: 'memory-groups/memory-groups-frontend', feature: 'memory-groups', key: 'memory-groups' },
  { dir: 'number-grid-sprint/number-grid-frontend', feature: 'number-grid', key: 'number-grid' },
  { dir: 'object-placement-memory/object-placement-memory-frontend', feature: 'object-placement', key: 'object-placement' },
  { dir: 'pattern-survival/pattern-survival-frontend', feature: 'pattern-survival', key: 'pattern-survival' },
  { dir: 'rapid-category-sort/rapid-sort-frontend', feature: 'rapid-sort', key: 'rapid-sort' },
  { dir: 'reflex-endurance/reflex-endurance-frontend', feature: 'reflex-endurance', key: 'reflex-endurance' },
  { dir: 'sequence-recall/sequence-recall-frontend', feature: 'sequence-recall', key: 'sequence-recall' },
  { dir: 'sliding-puzzle/sliding-puzzle-frontend', feature: 'sliding-puzzle', key: 'sliding-puzzle' },
  { dir: 'speed-type-answer/speed-type-frontend', feature: 'speed-type', key: 'speed-type' },
  { dir: 'true-false-blitz/true-false-blitz-frontend', feature: 'true-false-blitz', key: 'true-false-blitz' },
  { dir: 'word-unscramble/word-unscramble-frontend', feature: 'word-unscramble', key: 'word-unscramble' },
];

function pascalCase(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function genTypes(gameName) {
  const pascal = pascalCase(gameName);
  return `export interface ${pascal}ProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface ${pascal}SavePayload {
  userId?: string;
  stageId?: string;
  progress: ${pascal}ProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
`;
}

function genOutbox(gameName) {
  const pascal = pascalCase(gameName);
  return `import type { ${pascal}ProgressEntry, ${pascal}SavePayload } from './saveProgressTypes';

const STORAGE_KEY = '${gameName}-save-progress';
const OUTBOX_KEY = '${gameName}-save-outbox';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readProgress(): ${pascal}ProgressEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ${pascal}ProgressEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeProgress(entries: ${pascal}ProgressEntry[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveLevel(entry: ${pascal}ProgressEntry): void {
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

export function getProgress(): ${pascal}ProgressEntry[] { return readProgress(); }
export function getLevelProgress(levelIndex: number): ${pascal}ProgressEntry | undefined { return readProgress().find((e) => e.levelIndex === levelIndex); }
export function getHighestCompletedLevel(): number { const p = readProgress(); return p.length === 0 ? 0 : Math.max(...p.map((e) => e.levelIndex)); }
export function getTotalScore(): number { return readProgress().reduce((sum, e) => sum + e.score, 0); }

function queueForSync(progress: ${pascal}ProgressEntry[]): void {
  if (!canUseStorage()) return;
  const payload: ${pascal}SavePayload = {
    progress,
    lastPlayedLevel: Math.max(0, ...progress.map((e) => e.levelIndex)),
    totalScore: progress.reduce((sum, e) => sum + e.score, 0),
    savedAt: Date.now(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload));
}

export function getOutboxPayload(): ${pascal}SavePayload | null {
  if (!canUseStorage()) return null;
  try { const raw = localStorage.getItem(OUTBOX_KEY); if (!raw) return null; return JSON.parse(raw) as ${pascal}SavePayload; } catch { return null; }
}

export function clearOutbox(): void { if (!canUseStorage()) return; localStorage.removeItem(OUTBOX_KEY); }
export function hasUnsyncedProgress(): boolean { return getOutboxPayload() !== null; }
`;
}

let count = 0;
for (const game of games) {
  // Try to find existing features folder
  const srcDir = path.join(base, game.dir, 'src');
  const featuresDir = path.join(srcDir, 'features');
  
  // Determine where to put save-progress
  let saveDir;
  if (fs.existsSync(featuresDir)) {
    // Look for existing feature folder
    const featureDirs = fs.readdirSync(featuresDir).filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory());
    if (featureDirs.length > 0) {
      saveDir = path.join(featuresDir, featureDirs[0], 'save-progress');
    } else {
      saveDir = path.join(featuresDir, game.feature, 'save-progress');
    }
  } else {
    saveDir = path.join(srcDir, 'features', game.feature, 'save-progress');
  }
  
  fs.mkdirSync(saveDir, { recursive: true });
  fs.writeFileSync(path.join(saveDir, 'saveProgressTypes.ts'), genTypes(game.key));
  fs.writeFileSync(path.join(saveDir, 'saveProgressOutbox.ts'), genOutbox(game.key));
  count++;
}
console.log('Created save-progress systems for ' + count + ' games');
