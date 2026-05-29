const fs = require('fs');
const path = require('path');

const base = 'C:\\game\\zubaco-games-repo\\zubaco-games';

const games = [
  { dir: 'flash-spot/flash-spot-frontend', alias: true, name: 'flash-spot', sounds: { spotHit: 'sfx', spotMiss: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'Infinity-loop/infinity-loop-frontend', alias: true, name: 'infinity-loop', sounds: { tileRotate: 'sfx', tileConnect: 'sfx', puzzleSolve: 'sfx', levelComplete: 'sfx', hint: 'sfx', uiClick: 'ui' } },
  { dir: 'live-route-builder/live-route-frontend', alias: false, name: 'live-route', sounds: { routePlace: 'sfx', routeConnect: 'sfx', routeError: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'logic-reflector/logic-reflector-frontend', alias: true, name: 'logic-reflector', sounds: { mirrorPlace: 'sfx', beamHit: 'sfx', beamMiss: 'sfx', puzzleSolve: 'sfx', levelComplete: 'sfx', hint: 'sfx', uiClick: 'ui' } },
  { dir: 'maze-navigation/maze-navigation-frontend', alias: true, name: 'maze-navigation', sounds: { stepForward: 'sfx', wallHit: 'sfx', pathFound: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'memory-card-matching/memory-card-matching-frontend', alias: true, name: 'memory-card', sounds: { cardFlip: 'sfx', cardMatch: 'sfx', cardMismatch: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'memory-groups/memory-groups-frontend', alias: false, name: 'memory-groups', sounds: { itemSelect: 'sfx', groupMatch: 'sfx', groupMismatch: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'number-grid-sprint/number-grid-frontend', alias: true, name: 'number-grid', sounds: { numberTap: 'sfx', numberCorrect: 'sfx', numberWrong: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'object-placement-memory/object-placement-memory-frontend', alias: true, name: 'object-placement', sounds: { objectPlace: 'sfx', objectCorrect: 'sfx', objectWrong: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'pattern-survival/pattern-survival-frontend', alias: false, name: 'pattern-survival', sounds: { patternShow: 'sfx', patternInput: 'sfx', patternCorrect: 'sfx', patternWrong: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'rapid-category-sort/rapid-sort-frontend', alias: true, name: 'rapid-sort', sounds: { itemSwipe: 'sfx', sortCorrect: 'sfx', sortWrong: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'reflex-endurance/reflex-endurance-frontend', alias: false, name: 'reflex-endurance', sounds: { targetAppear: 'sfx', targetHit: 'sfx', targetMiss: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', uiClick: 'ui' } },
  { dir: 'sliding-puzzle/sliding-puzzle-frontend', alias: true, name: 'sliding-puzzle', sounds: { tileSlide: 'sfx', puzzleSolve: 'sfx', levelComplete: 'sfx', hint: 'sfx', undo: 'sfx', uiClick: 'ui' } },
  { dir: 'speed-type-answer/speed-type-frontend', alias: false, name: 'speed-type', sounds: { keyPress: 'sfx', wordCorrect: 'sfx', wordWrong: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'true-false-blitz/true-false-blitz-frontend', alias: true, name: 'true-false', sounds: { answerCorrect: 'sfx', answerWrong: 'sfx', combo: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
  { dir: 'word-unscramble/word-unscramble-frontend', alias: true, name: 'word-unscramble', sounds: { letterPlace: 'sfx', wordCorrect: 'sfx', wordWrong: 'sfx', hint: 'sfx', levelComplete: 'sfx', gameOver: 'sfx', timerWarning: 'sfx', uiClick: 'ui' } },
];

function getImport(alias, mod) {
  return alias ? '@/audio/' + mod : './' + mod;
}

function genTypes() {
  return [
    "export type SoundCategory = 'sfx' | 'music' | 'ui' | 'voice';",
    "",
    "export type VolumeState = { master: number; } & Record<SoundCategory, number>;",
    "",
    "export interface SoundDefinition { path: string; category: SoundCategory; defaultVolume?: number; loop?: boolean; preload?: boolean; sceneTags?: string[]; }",
    "",
    "export interface PlaySoundOptions { volume?: number; loop?: boolean; playbackRate?: number; allowOverlap?: boolean; fadeInMs?: number; }",
    "",
    "export interface SoundInstance { instanceId: string; soundKey: string; playbackId: number; offsetSec: number; loop: boolean; playbackRate: number; baseVolume: number; }",
    "",
    "export interface AudioManagerOptions<TSoundKey extends string> { registry: Record<TSoundKey, SoundDefinition>; initialVolume?: Partial<VolumeState>; }",
    "",
    "export interface AudioService<TSoundKey extends string> {",
    "  readonly ready: boolean;",
    "  readonly unlocked: boolean;",
    "  initialize(): Promise<void>;",
    "  unlock(): Promise<void>;",
    "  preloadAll(): Promise<void>;",
    "  preloadSounds(keys: readonly TSoundKey[]): Promise<void>;",
    "  preloadByScene(sceneTag: string): Promise<void>;",
    "  play(key: TSoundKey, options?: PlaySoundOptions): Promise<string | null>;",
    "  stopByInstance(instanceId: string): void;",
    "  stopSound(key: TSoundKey): void;",
    "  stopAll(): void;",
    "  pauseAll(): void;",
    "  resumeAll(): Promise<void>;",
    "  setMuted(muted: boolean): void;",
    "  toggleMuted(): void;",
    "  setMasterVolume(value: number): void;",
    "  setCategoryVolume(category: SoundCategory, value: number): void;",
    "  getVolume(): VolumeState;",
    "  getMuted(): boolean;",
    "}",
    ""
  ].join('\n');
}

function genManager(alias) {
  const imp = getImport(alias, 'types');
  return `import type { AudioManagerOptions, AudioService, PlaySoundOptions, SoundCategory, SoundDefinition, SoundInstance, VolumeState } from '${imp}';
import { Howl, Howler } from 'howler';

const DEFAULT_VOLUME: VolumeState = { master: 1, sfx: 1, music: 0.7, ui: 0.9, voice: 1 };
function clampVolume(v: number): number { return Math.max(0, Math.min(1, v)); }
function createInstanceId(): string { return \`snd_\${crypto.randomUUID()}\`; }

export class AudioManager<TSoundKey extends string> implements AudioService<TSoundKey> {
  private readonly registry: Record<TSoundKey, SoundDefinition>;
  private readonly howls = new Map<TSoundKey, Howl>();
  private readonly activeInstances = new Map<string, SoundInstance>();
  private readonly activeBySound = new Map<TSoundKey, Set<string>>();
  private readonly endListeners = new Map<string, () => void>();
  private volume: VolumeState;
  private muted = false;
  private initialized = false;
  private unlockedState = false;

  constructor(options: AudioManagerOptions<TSoundKey>) {
    this.registry = options.registry;
    this.volume = { ...DEFAULT_VOLUME, ...(options.initialVolume ?? {}) };
    this.unlockedState = Howler.ctx?.state === 'running';
    this.applyVolume();
  }
  get ready(): boolean { return this.initialized; }
  get unlocked(): boolean { return this.unlockedState; }
  async initialize(): Promise<void> { if (this.initialized) return; await this.preloadMarked(); this.initialized = true; }
  async unlock(): Promise<void> { try { if (Howler.ctx?.state === 'suspended') await Howler.ctx.resume(); } catch {} this.unlockedState = Howler.ctx?.state === 'running'; }
  async preloadAll(): Promise<void> { await this.preloadSounds(Object.keys(this.registry) as TSoundKey[]); }
  async preloadSounds(keys: readonly TSoundKey[]): Promise<void> { await Promise.all(keys.map((k) => this.getHowl(k))); }
  async preloadByScene(sceneTag: string): Promise<void> { const keys = (Object.keys(this.registry) as TSoundKey[]).filter((k) => this.registry[k].sceneTags?.includes(sceneTag)); await this.preloadSounds(keys); }
  async play(key: TSoundKey, options: PlaySoundOptions = {}): Promise<string | null> {
    await this.unlock();
    const def = this.registry[key]; const howl = await this.getHowl(key); if (!howl) return null;
    if (!options.allowOverlap) this.stopSound(key);
    const baseVol = options.volume ?? def.defaultVolume ?? 1;
    const effVol = this.getEffectiveVolume(def.category, baseVol);
    const loop = options.loop ?? def.loop ?? false; const rate = options.playbackRate ?? 1;
    howl.loop(loop); howl.rate(rate); howl.volume(effVol);
    const pid = howl.play(); if (typeof pid !== 'number') return null;
    const iid = createInstanceId();
    const inst: SoundInstance = { instanceId: iid, soundKey: key, playbackId: pid, offsetSec: 0, loop, playbackRate: rate, baseVolume: baseVol };
    this.activeInstances.set(iid, inst);
    if (!this.activeBySound.has(key)) this.activeBySound.set(key, new Set());
    this.activeBySound.get(key)?.add(iid);
    const onEnd = () => { this.cleanupInstance(iid, key); };
    this.endListeners.set(iid, onEnd); howl.once('end', onEnd, pid);
    if (options.fadeInMs && options.fadeInMs > 0 && effVol > 0) { howl.volume(0, pid); howl.fade(0, effVol, options.fadeInMs, pid); }
    return iid;
  }
  stopByInstance(iid: string): void { const inst = this.activeInstances.get(iid); if (!inst) return; const sk = inst.soundKey as TSoundKey; const h = this.howls.get(sk); h?.stop(inst.playbackId); const l = this.endListeners.get(iid); if (l && h) h.off('end', l, inst.playbackId); this.endListeners.delete(iid); this.cleanupInstance(iid, sk); }
  stopSound(key: TSoundKey): void { const s = this.activeBySound.get(key); if (!s?.size) return; [...s].forEach((id) => this.stopByInstance(id)); }
  stopAll(): void { [...this.activeInstances.keys()].forEach((id) => this.stopByInstance(id)); }
  pauseAll(): void { Howler.mute(true); }
  async resumeAll(): Promise<void> { await this.unlock(); Howler.mute(this.muted); }
  setMuted(m: boolean): void { this.muted = m; this.applyVolume(); }
  toggleMuted(): void { this.setMuted(!this.muted); }
  setMasterVolume(v: number): void { this.volume.master = clampVolume(v); this.applyVolume(); }
  setCategoryVolume(cat: SoundCategory, v: number): void { this.volume[cat] = clampVolume(v); this.applyVolume(); }
  getVolume(): VolumeState { return { ...this.volume }; }
  getMuted(): boolean { return this.muted; }
  private async preloadMarked(): Promise<void> { const keys = (Object.keys(this.registry) as TSoundKey[]).filter((k) => this.registry[k].preload); await this.preloadSounds(keys); }
  private async getHowl(key: TSoundKey): Promise<Howl | null> { const ex = this.howls.get(key); if (ex) return ex; const def = this.registry[key]; try { const h = new Howl({ src: [def.path], preload: true, loop: def.loop ?? false, html5: false, volume: this.getEffectiveVolume(def.category, def.defaultVolume ?? 1) }); await new Promise<void>((res, rej) => { h.once('load', () => res()); h.once('loaderror', (_: number, e?: unknown) => { rej(e instanceof Error ? e : new Error('Failed to load ' + String(key))); }); }); this.howls.set(key, h); return h; } catch { return null; } }
  private cleanupInstance(iid: string, sk: TSoundKey): void { this.activeInstances.delete(iid); this.activeBySound.get(sk)?.delete(iid); if (!this.activeBySound.get(sk)?.size) this.activeBySound.delete(sk); this.endListeners.delete(iid); }
  private applyVolume(): void { (Object.keys(this.registry) as TSoundKey[]).forEach((k) => { const h = this.howls.get(k); if (!h) return; const d = this.registry[k]; h.volume(this.getEffectiveVolume(d.category, d.defaultVolume ?? 1)); }); }
  private getEffectiveVolume(cat: SoundCategory, base: number): number { return clampVolume(base * this.volume.master * this.volume[cat] * (this.muted ? 0 : 1)); }
}
`;
}

function genRegistry(alias, gameName, sounds) {
  const imp = getImport(alias, 'types');
  let entries = '';
  for (const [key, cat] of Object.entries(sounds)) {
    const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    entries += `  ${key}: { path: '/audio/${gameName}/${kebab}.wav', category: '${cat}', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },\n`;
  }
  return `import type { SoundDefinition } from '${imp}';\n\nexport const soundRegistry = {\n${entries}} as const satisfies Record<string, SoundDefinition>;\n\nexport type SoundKey = keyof typeof soundRegistry;\n`;
}

function genProvider(alias) {
  const mgrImp = getImport(alias, 'AudioManager');
  const regImp = getImport(alias, 'soundRegistry');
  const typImp = getImport(alias, 'types');
  return `import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AudioManager } from '${mgrImp}';
import { soundRegistry, type SoundKey } from '${regImp}';
import type { PlaySoundOptions, SoundCategory, VolumeState } from '${typImp}';

export interface AudioContextValue { ready: boolean; unlocked: boolean; muted: boolean; volume: VolumeState; unlockAudio: () => Promise<void>; preloadAll: () => Promise<void>; preloadSounds: (keys: readonly SoundKey[]) => Promise<void>; preloadScene: (sceneTag: string) => Promise<void>; play: (key: SoundKey, options?: PlaySoundOptions) => Promise<string | null>; stopSound: (key: SoundKey) => void; stopByInstance: (instanceId: string) => void; stopAll: () => void; pauseAll: () => void; resumeAll: () => Promise<void>; setMuted: (muted: boolean) => void; toggleMuted: () => void; setMasterVolume: (value: number) => void; setCategoryVolume: (category: SoundCategory, value: number) => void; }

const AudioCtx = createContext<AudioContextValue | null>(null);
const isTestEnv = import.meta.env.MODE === 'test';

export function AudioProvider({ children }: { children: ReactNode }) {
  const [mgr] = useState(() => new AudioManager<SoundKey>({ registry: soundRegistry }));
  const [ready, setReady] = useState(isTestEnv);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMutedState] = useState(() => mgr.getMuted());
  const [volume, setVolume] = useState(() => mgr.getVolume());

  useEffect(() => { let m = true; if (isTestEnv) return () => { m = false; mgr.stopAll(); }; void mgr.initialize().then(() => { if (m) setReady(true); }); return () => { m = false; mgr.stopAll(); }; }, [mgr]);
  useEffect(() => { if (isTestEnv) return; const unlock = () => { void mgr.unlock().then(() => setUnlocked(mgr.unlocked)); window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); window.removeEventListener('keydown', unlock); }; window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('touchstart', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true }); return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); window.removeEventListener('keydown', unlock); }; }, [mgr]);

  const sync = useCallback(() => { setVolume(mgr.getVolume()); setMutedState(mgr.getMuted()); }, [mgr]);
  const value = useMemo<AudioContextValue>(() => ({ ready, unlocked, muted, volume, unlockAudio: async () => { await mgr.unlock(); setUnlocked(mgr.unlocked); }, preloadAll: () => mgr.preloadAll(), preloadSounds: (k) => mgr.preloadSounds(k), preloadScene: (s) => mgr.preloadByScene(s), play: (k, o) => mgr.play(k, o), stopSound: (k) => mgr.stopSound(k), stopByInstance: (i) => mgr.stopByInstance(i), stopAll: () => mgr.stopAll(), pauseAll: () => mgr.pauseAll(), resumeAll: () => mgr.resumeAll(), setMuted: (m) => { mgr.setMuted(m); sync(); }, toggleMuted: () => { mgr.toggleMuted(); sync(); }, setMasterVolume: (v) => { mgr.setMasterVolume(v); sync(); }, setCategoryVolume: (c, v) => { mgr.setCategoryVolume(c, v); sync(); } }), [mgr, muted, ready, sync, unlocked, volume]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudioContextValue(): AudioContextValue { const ctx = useContext(AudioCtx); if (!ctx) throw new Error('useAudioContextValue must be used inside AudioProvider'); return ctx; }
`;
}

function genUseAudio(alias) {
  const provImp = getImport(alias, 'AudioProvider');
  const regImp = getImport(alias, 'soundRegistry');
  const typImp = getImport(alias, 'types');
  return `import { useMemo } from 'react';
import { useAudioContextValue } from '${provImp}';
import type { SoundKey } from '${regImp}';
import type { PlaySoundOptions } from '${typImp}';

export function useAudio() { return useAudioContextValue(); }

export function useSound(soundKey: SoundKey) {
  const audio = useAudio();
  return useMemo(() => ({ play: (options?: PlaySoundOptions) => audio.play(soundKey, options), stop: () => audio.stopSound(soundKey) }), [audio, soundKey]);
}
`;
}

function genIndex(alias) {
  const p = alias ? '@/audio/' : './';
  return `export { AudioManager } from '${p}AudioManager';
export { AudioProvider, useAudioContextValue } from '${p}AudioProvider';
export { soundRegistry } from '${p}soundRegistry';
export type { SoundKey } from '${p}soundRegistry';
export { useAudio, useSound } from '${p}useAudio';
export type { AudioService, PlaySoundOptions, SoundCategory, SoundDefinition, VolumeState } from '${p}types';
`;
}

let count = 0;
for (const game of games) {
  const audioDir = path.join(base, game.dir, 'src', 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(path.join(audioDir, 'types.ts'), genTypes());
  fs.writeFileSync(path.join(audioDir, 'AudioManager.ts'), genManager(game.alias));
  fs.writeFileSync(path.join(audioDir, 'soundRegistry.ts'), genRegistry(game.alias, game.name, game.sounds));
  fs.writeFileSync(path.join(audioDir, 'AudioProvider.tsx'), genProvider(game.alias));
  fs.writeFileSync(path.join(audioDir, 'useAudio.ts'), genUseAudio(game.alias));
  fs.writeFileSync(path.join(audioDir, 'index.ts'), genIndex(game.alias));
  count++;
}
console.log('Created audio systems for ' + count + ' games');
