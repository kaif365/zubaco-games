import type {
  AudioManagerOptions,
  AudioService,
  PlaySoundOptions,
  SoundCategory,
  SoundDefinition,
  SoundInstance,
  VolumeState,
} from '@/audio/types';
import { Howl, Howler } from 'howler';

const DEFAULT_VOLUME: VolumeState = {
  master: 1,
  sfx: 1,
  music: 0.7,
  ui: 0.9,
  voice: 1,
};

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createInstanceId(): string {
  return `snd_${crypto.randomUUID()}`;
}

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
    this.volume = {
      ...DEFAULT_VOLUME,
      ...(options.initialVolume ?? {}),
    };
    this.unlockedState = Howler.ctx?.state === 'running';
    this.applyVolume();
  }

  get ready(): boolean {
    return this.initialized;
  }

  get unlocked(): boolean {
    return this.unlockedState;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.preloadMarked();
    this.initialized = true;
  }

  async unlock(): Promise<void> {
    try {
      if (Howler.ctx?.state === 'suspended') {
        await Howler.ctx.resume();
      }
    } catch {
      // Browsers may reject until a user gesture
    }
    this.unlockedState = Howler.ctx?.state === 'running';
  }

  async preloadAll(): Promise<void> {
    const keys = Object.keys(this.registry) as TSoundKey[];
    await this.preloadSounds(keys);
  }

  async preloadSounds(keys: readonly TSoundKey[]): Promise<void> {
    const tasks = keys.map((key) => this.getHowl(key));
    await Promise.all(tasks);
  }

  async preloadByScene(sceneTag: string): Promise<void> {
    const keys = (Object.keys(this.registry) as TSoundKey[]).filter((key) =>
      this.registry[key].sceneTags?.includes(sceneTag),
    );
    await this.preloadSounds(keys);
  }

  async play(key: TSoundKey, options: PlaySoundOptions = {}): Promise<string | null> {
    await this.unlock();
    const definition = this.registry[key];
    const howl = await this.getHowl(key);
    if (!howl) return null;

    if (!options.allowOverlap) {
      this.stopSound(key);
    }

    const baseVolume = options.volume ?? definition.defaultVolume ?? 1;
    const effectiveVolume = this.getEffectiveVolume(definition.category, baseVolume);
    const loop = options.loop ?? definition.loop ?? false;
    const playbackRate = options.playbackRate ?? 1;

    howl.loop(loop);
    howl.rate(playbackRate);
    howl.volume(effectiveVolume);

    const playbackId = howl.play();
    if (typeof playbackId !== 'number') return null;
    const instanceId = createInstanceId();
    const instance: SoundInstance = {
      instanceId,
      soundKey: key,
      playbackId,
      offsetSec: 0,
      loop,
      playbackRate,
      baseVolume,
    };
    this.activeInstances.set(instanceId, instance);
    if (!this.activeBySound.has(key)) {
      this.activeBySound.set(key, new Set());
    }
    this.activeBySound.get(key)?.add(instanceId);

    const onEnded = () => {
      this.cleanupInstance(instanceId, key);
    };
    this.endListeners.set(instanceId, onEnded);
    howl.once('end', onEnded, playbackId);

    if (options.fadeInMs && options.fadeInMs > 0 && effectiveVolume > 0) {
      howl.volume(0, playbackId);
      howl.fade(0, effectiveVolume, options.fadeInMs, playbackId);
    }

    return instanceId;
  }

  stopByInstance(instanceId: string): void {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) return;
    const soundKey = instance.soundKey as TSoundKey;
    const howl = this.howls.get(soundKey);
    howl?.stop(instance.playbackId);
    const listener = this.endListeners.get(instanceId);
    if (listener && howl) {
      howl.off('end', listener, instance.playbackId);
    }
    this.endListeners.delete(instanceId);
    this.cleanupInstance(instanceId, instance.soundKey as TSoundKey);
  }

  stopSound(key: TSoundKey): void {
    const instances = this.activeBySound.get(key);
    if (!instances?.size) return;
    [...instances].forEach((instanceId) => {
      this.stopByInstance(instanceId);
    });
  }

  stopAll(): void {
    [...this.activeInstances.keys()].forEach((instanceId) => {
      this.stopByInstance(instanceId);
    });
  }

  pauseAll(): void {
    Howler.mute(true);
  }

  async resumeAll(): Promise<void> {
    await this.unlock();
    Howler.mute(this.muted);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  setMasterVolume(value: number): void {
    this.volume.master = clampVolume(value);
    this.applyVolume();
  }

  setCategoryVolume(category: SoundCategory, value: number): void {
    this.volume[category] = clampVolume(value);
    this.applyVolume();
  }

  getVolume(): VolumeState {
    return { ...this.volume };
  }

  getMuted(): boolean {
    return this.muted;
  }

  private async preloadMarked(): Promise<void> {
    const keys = (Object.keys(this.registry) as TSoundKey[]).filter(
      (key) => this.registry[key].preload,
    );
    await this.preloadSounds(keys);
  }

  private async getHowl(key: TSoundKey): Promise<Howl | null> {
    const existing = this.howls.get(key);
    if (existing) return existing;
    const definition = this.registry[key];

    try {
      const howl = new Howl({
        src: [definition.path],
        preload: true,
        loop: definition.loop ?? false,
        html5: false,
        volume: this.getEffectiveVolume(definition.category, definition.defaultVolume ?? 1),
      });
      await new Promise<void>((resolve, reject) => {
        howl.once('load', () => resolve());
        howl.once('loaderror', (_id: number, err?: unknown) => {
          reject(err instanceof Error ? err : new Error(`Failed to load sound ${String(key)}`));
        });
      });
      this.howls.set(key, howl);
      return howl;
    } catch {
      return null;
    }
  }

  private cleanupInstance(instanceId: string, soundKey: TSoundKey): void {
    this.activeInstances.delete(instanceId);
    this.activeBySound.get(soundKey)?.delete(instanceId);
    if (!this.activeBySound.get(soundKey)?.size) {
      this.activeBySound.delete(soundKey);
    }
    this.endListeners.delete(instanceId);
  }

  private applyVolume(): void {
    (Object.keys(this.registry) as TSoundKey[]).forEach((key) => {
      const howl = this.howls.get(key);
      if (!howl) return;
      const definition = this.registry[key];
      const baseVolume = definition.defaultVolume ?? 1;
      howl.volume(this.getEffectiveVolume(definition.category, baseVolume));
    });
  }

  private getEffectiveVolume(category: SoundCategory, baseVolume: number): number {
    return clampVolume(
      baseVolume * this.volume.master * this.volume[category] * (this.muted ? 0 : 1),
    );
  }
}
