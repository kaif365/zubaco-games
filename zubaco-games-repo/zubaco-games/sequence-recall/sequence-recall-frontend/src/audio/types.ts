export type SoundCategory = 'sfx' | 'music' | 'ui' | 'voice';

export type VolumeState = {
  master: number;
} & Record<SoundCategory, number>;

export interface SoundDefinition {
  path: string;
  category: SoundCategory;
  defaultVolume?: number;
  loop?: boolean;
  preload?: boolean;
  sceneTags?: string[];
  pack?: string;
}

export interface PlaySoundOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  allowOverlap?: boolean;
  fadeInMs?: number;
}

export interface PauseState<TSoundKey extends string = string> {
  soundKey: TSoundKey;
  offsetSec: number;
  loop: boolean;
  playbackRate: number;
  volume: number;
}

export interface SoundInstance {
  instanceId: string;
  soundKey: string;
  playbackId: number;
  offsetSec: number;
  loop: boolean;
  playbackRate: number;
  baseVolume: number;
}

export interface AudioManagerOptions<TSoundKey extends string> {
  registry: Record<TSoundKey, SoundDefinition>;
  initialVolume?: Partial<VolumeState>;
}

export interface AudioService<TSoundKey extends string> {
  readonly ready: boolean;
  readonly unlocked: boolean;
  initialize(): Promise<void>;
  unlock(): Promise<void>;
  preloadAll(): Promise<void>;
  preloadSounds(keys: readonly TSoundKey[]): Promise<void>;
  preloadByScene(sceneTag: string): Promise<void>;
  play(key: TSoundKey, options?: PlaySoundOptions): Promise<string | null>;
  stopByInstance(instanceId: string): void;
  stopSound(key: TSoundKey): void;
  stopAll(): void;
  pauseAll(): void;
  resumeAll(): Promise<void>;
  setMuted(muted: boolean): void;
  toggleMuted(): void;
  setMasterVolume(value: number): void;
  setCategoryVolume(category: SoundCategory, value: number): void;
  getVolume(): VolumeState;
  getMuted(): boolean;
}
