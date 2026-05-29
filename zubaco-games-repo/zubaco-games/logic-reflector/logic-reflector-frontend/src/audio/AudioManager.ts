import type { AudioManagerOptions, AudioService, PlaySoundOptions, SoundCategory, SoundDefinition, SoundInstance, VolumeState } from '@/audio/types';
import { Howl, Howler } from 'howler';

const DEFAULT_VOLUME: VolumeState = { master: 1, sfx: 1, music: 0.7, ui: 0.9, voice: 1 };
function clampVolume(v: number): number { return Math.max(0, Math.min(1, v)); }
function createInstanceId(): string { return `snd_${crypto.randomUUID()}`; }

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
