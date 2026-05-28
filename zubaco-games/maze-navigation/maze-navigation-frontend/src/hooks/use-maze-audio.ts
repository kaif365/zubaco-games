import { MAZE_AUDIO_FILES, MAZE_AUDIO_VOLUME } from "@/constants/audio";
import { Howl, Howler } from "howler";
import { useCallback, useEffect, useRef } from "react";

interface MazeAudioController {
  playBgm: () => void;
  stopBgm: () => void;
  playMove: () => void;
  playPickSide: () => void;
  playWin: () => void;
  playLose: () => void;
  unload: () => void;
}

type MazeHowls = {
  readonly bgm: Howl;
  readonly move: Howl;
  readonly pickSide: Howl;
  readonly win: Howl;
  readonly lose: Howl;
};

function warnLoadError(key: keyof typeof MAZE_AUDIO_FILES, error: unknown) {
  // Keep runtime resilient even when placeholder assets are missing.
  console.warn(`[maze-audio] Failed to load "${key}" sound`, error);
}

export function useMazeAudio(soundEnabled = true): MazeAudioController {
  const howlsRef = useRef<MazeHowls | null>(null);

  useEffect(() => {
    if (howlsRef.current) {
      return;
    }

    howlsRef.current = {
      bgm: new Howl({
        src: [MAZE_AUDIO_FILES.bgm],
        loop: true,
        volume: MAZE_AUDIO_VOLUME.bgm,
        onloaderror: (_, error) => warnLoadError("bgm", error),
      }),
      move: new Howl({
        src: [MAZE_AUDIO_FILES.move],
        volume: MAZE_AUDIO_VOLUME.move,
        onloaderror: (_, error) => warnLoadError("move", error),
      }),
      pickSide: new Howl({
        src: [MAZE_AUDIO_FILES.pickSide],
        volume: MAZE_AUDIO_VOLUME.pickSide,
        onloaderror: (_, error) => warnLoadError("pickSide", error),
      }),
      win: new Howl({
        src: [MAZE_AUDIO_FILES.win],
        volume: MAZE_AUDIO_VOLUME.win,
        onloaderror: (_, error) => warnLoadError("win", error),
      }),
      lose: new Howl({
        src: [MAZE_AUDIO_FILES.lose],
        volume: MAZE_AUDIO_VOLUME.lose,
        onloaderror: (_, error) => warnLoadError("lose", error),
      }),
    };

    return () => {
      const sounds = howlsRef.current;
      if (!sounds) {
        return;
      }
      Object.values(sounds).forEach((sound) => sound.unload());
      howlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    Howler.mute(!soundEnabled);

    if (soundEnabled && Howler.ctx?.state === "suspended") {
      void Howler.ctx.resume();
    }
  }, [soundEnabled]);

  const playBgm = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    const bgm = howlsRef.current?.bgm;
    if (!bgm || bgm.playing()) {
      return;
    }
    bgm.play();
  }, [soundEnabled]);

  const stopBgm = useCallback(() => {
    const bgm = howlsRef.current?.bgm;
    if (!bgm || !bgm.playing()) {
      return;
    }
    bgm.stop();
  }, []);

  const playMove = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    howlsRef.current?.move.play();
  }, [soundEnabled]);

  const playPickSide = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    howlsRef.current?.pickSide.play();
  }, [soundEnabled]);

  const playWin = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    howlsRef.current?.win.play();
  }, [soundEnabled]);

  const playLose = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    howlsRef.current?.lose.play();
  }, [soundEnabled]);

  const unload = useCallback(() => {
    const sounds = howlsRef.current;
    if (!sounds) {
      return;
    }
    Object.values(sounds).forEach((sound) => sound.unload());
    howlsRef.current = null;
  }, []);

  return {
    playBgm,
    stopBgm,
    playMove,
    playPickSide,
    playWin,
    playLose,
    unload,
  };
}
