import { Howl, Howler } from 'howler';

import type {
  AudioManagerOptions,
  AudioService,
  PlaySoundOptions,
  SoundCategory,
  SoundDefinition,
  SoundInstance,
  VolumeState,
} from '@/audio/types';

const DEFAULT_VOLUME: VolumeState = {
  master: 1,
  sfx: 1,
  music: 0.7,
  ui: 0.9,
  voice: 1,
};

/**
 * Clamp volume.
 *
 * @param {number} value - The value.
 *
 * @returns {number} The result of clampVolume.
 */
function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Creates instance id.
 *
 * @returns {string} The result of createInstanceId.
 */
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
    // @types/howler types `Howler.ctx` as always defined; it is null before Web Audio init (e.g. Jest).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    this.unlockedState = Howler.ctx?.state === 'running';
    this.applyVolume();
  }

  get ready(): boolean {
    return this.initialized;
  }

  get unlocked(): boolean {
    return this.unlockedState;
  }

  /**
   * Initialize.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.preloadMarked();
    this.initialized = true;
  }

  /**
   * Unlock.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async unlock(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (Howler.ctx?.state === 'suspended') {
        await Howler.ctx.resume();
      }
    } catch {
      // no-op: some browsers throw until there is a valid gesture
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    this.unlockedState = Howler.ctx?.state === 'running';
  }

  /**
   * Preload all.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async preloadAll(): Promise<void> {
    const keys = Object.keys(this.registry) as TSoundKey[];
    await this.preloadSounds(keys);
  }

  /**
   * Preload sounds.
   *
   * @param {readonly TSoundKey[]} keys - The keys.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async preloadSounds(keys: readonly TSoundKey[]): Promise<void> {
    const tasks = keys.map((key) => this.getHowl(key));
    await Promise.all(tasks);
  }

  /**
   * Preload by scene.
   *
   * @param {string} sceneTag - The scene tag.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async preloadByScene(sceneTag: string): Promise<void> {
    const keys = (Object.keys(this.registry) as TSoundKey[]).filter((key) =>
      this.registry[key].sceneTags?.includes(sceneTag),
    );
    await this.preloadSounds(keys);
  }

  /**
   * Play.
   *
   * @param {TSoundKey} key - The key.
   * @param {PlaySoundOptions} options - Function options.
   * @param {number | undefined} [options.volume] - The volume.
   * @param {boolean | undefined} [options.loop] - The loop.
   * @param {number | undefined} [options.playbackRate] - The playback rate.
   * @param {boolean | undefined} [options.allowOverlap] - The allow overlap.
   * @param {number | undefined} [options.fadeInMs] - The fade in ms.
   *
   * @returns {Promise<string | null>} A promise that resolves with the result.
   */
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

    /**
     * On ended.
     *
     * @returns {void} No return value.
     */
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

  /**
   * Stop by instance.
   *
   * @param {string} instanceId - The instance id.
   *
   * @returns {void} No return value.
   */
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

  /**
   * Stop sound.
   *
   * @param {TSoundKey} key - The key.
   *
   * @returns {void} No return value.
   */
  stopSound(key: TSoundKey): void {
    const instances = this.activeBySound.get(key);
    if (!instances?.size) return;
    [...instances].forEach((instanceId) => {
      this.stopByInstance(instanceId);
    });
  }

  /**
   * Stop all.
   *
   * @returns {void} No return value.
   */
  stopAll(): void {
    [...this.activeInstances.keys()].forEach((instanceId) => {
      this.stopByInstance(instanceId);
    });
  }

  /**
   * Pause all.
   *
   * @returns {void} No return value.
   */
  pauseAll(): void {
    Howler.mute(true);
  }

  /**
   * Resume all.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  async resumeAll(): Promise<void> {
    await this.unlock();
    Howler.mute(this.muted);
  }

  /**
   * Sets muted.
   *
   * @param {boolean} muted - The muted.
   *
   * @returns {void} No return value.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  /**
   * Toggle muted.
   *
   * @returns {void} No return value.
   */
  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  /**
   * Sets master volume.
   *
   * @param {number} value - The value.
   *
   * @returns {void} No return value.
   */
  setMasterVolume(value: number): void {
    this.volume.master = clampVolume(value);
    this.applyVolume();
  }

  /**
   * Sets category volume.
   *
   * @param {"sfx" | "music" | "ui" | "voice"} category - The category.
   * @param {number} value - The value.
   *
   * @returns {void} No return value.
   */
  setCategoryVolume(category: SoundCategory, value: number): void {
    this.volume[category] = clampVolume(value);
    this.applyVolume();
  }

  /**
   * Gets volume.
   *
   * @returns {{ master: number; } & Record<SoundCategory, number>} The result of getVolume.
   */
  getVolume(): VolumeState {
    return { ...this.volume };
  }

  /**
   * Gets muted.
   *
   * @returns {boolean} The result of getMuted.
   */
  getMuted(): boolean {
    return this.muted;
  }

  /**
   * Preload marked.
   *
   * @returns {Promise<void>} A promise that resolves when the operation completes.
   */
  private async preloadMarked(): Promise<void> {
    const keys = (Object.keys(this.registry) as TSoundKey[]).filter(
      (key) => this.registry[key].preload,
    );
    await this.preloadSounds(keys);
  }

  /**
   * Gets howl.
   *
   * @param {TSoundKey} key - The key.
   *
   * @returns {Promise<Howl | null>} A promise that resolves with the result.
   */
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
        howl.once('load', () => {
          resolve();
        });
        howl.once('loaderror', () => {
          reject(new Error(`Failed to load sound ${key}`));
        });
      });
      this.howls.set(key, howl);
      return howl;
    } catch {
      return null;
    }
  }

  /**
   * Cleanup instance.
   *
   * @param {string} instanceId - The instance id.
   * @param {TSoundKey} soundKey - The sound key.
   * @param {boolean} removeFromPause - The remove from pause.
   *
   * @returns {void} No return value.
   */
  private cleanupInstance(instanceId: string, soundKey: TSoundKey): void {
    this.activeInstances.delete(instanceId);
    this.activeBySound.get(soundKey)?.delete(instanceId);
    if (!this.activeBySound.get(soundKey)?.size) {
      this.activeBySound.delete(soundKey);
    }
    this.endListeners.delete(instanceId);
  }

  /**
   * Apply volume.
   *
   * @returns {void} No return value.
   */
  private applyVolume(): void {
    (Object.keys(this.registry) as TSoundKey[]).forEach((key) => {
      const howl = this.howls.get(key);
      if (!howl) return;
      const definition = this.registry[key];
      const baseVolume = definition.defaultVolume ?? 1;
      howl.volume(this.getEffectiveVolume(definition.category, baseVolume));
    });
  }

  /**
   * Gets effective volume.
   *
   * @param {"sfx" | "music" | "ui" | "voice"} category - The category.
   * @param {number} baseVolume - The base volume.
   *
   * @returns {number} The result of getEffectiveVolume.
   */
  private getEffectiveVolume(category: SoundCategory, baseVolume: number): number {
    return clampVolume(
      baseVolume * this.volume.master * this.volume[category] * (this.muted ? 0 : 1),
    );
  }
}
