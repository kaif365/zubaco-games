"use client";

import { Howl } from "howler";
import { useCallback, useEffect, useRef } from "react";

export const useAudio = (
  url: string,
  loop: boolean = true,
  enabled: boolean = true,
  volume: number = 0.5,
) => {
  const soundRef = useRef<Howl | null>(null);
  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);
  const playbackIdRef = useRef<number | null>(null);
  const previousEnabledRef = useRef(enabled);
  const wasPlayingBeforeBlurRef = useRef(false);

  const stopTrackedPlayback = useCallback((sound: Howl) => {
    const activePlaybackId = playbackIdRef.current;
    if (activePlaybackId !== null) {
      sound.stop(activePlaybackId);
      playbackIdRef.current = null;
      return;
    }
    if (sound.playing()) {
      sound.stop();
    }
  }, []);

  const restartPlayback = useCallback(
    (sound: Howl) => {
      stopTrackedPlayback(sound);
      playbackIdRef.current = sound.play();
    },
    [stopTrackedPlayback],
  );

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    soundRef.current?.stop();
    soundRef.current?.unload();

    const sound = new Howl({
      src: [url],
      html5: true,
      loop,
      volume: volumeRef.current,
      autoplay: false,
      onplayerror: function () {
        sound.once("unlock", function () {
          if (!enabledRef.current) return;
          sound.mute(false);
          restartPlayback(sound);
        });
      },
    });
    soundRef.current = sound;

    return () => {
      sound.stop();
      sound.unload();
      playbackIdRef.current = null;
      if (soundRef.current === sound) {
        soundRef.current = null;
      }
    };
  }, [loop, restartPlayback, url]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;

    if (!enabled) {
      sound.mute(true);
      sound.stop();
      playbackIdRef.current = null;
      return;
    }

    sound.mute(false);
    sound.volume(volume);
    const didEnableNow = !previousEnabledRef.current && enabled;
    const activePlaybackId = playbackIdRef.current;
    const isActivePlaybackRunning =
      activePlaybackId !== null && sound.playing(activePlaybackId);

    if (didEnableNow || !isActivePlaybackRunning) {
      restartPlayback(sound);
    }
  }, [enabled, restartPlayback, volume]);

  useEffect(() => {
    previousEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const syncFocusPlayback = () => {
      const sound = soundRef.current;
      if (!sound) return;

      const isVisible = globalThis.document.visibilityState === "visible";
      const hasFocus = globalThis.document.hasFocus();
      const isForegrounded = isVisible && hasFocus;

      if (isForegrounded) {
        if (!enabledRef.current) return;
        if (!wasPlayingBeforeBlurRef.current) return;
        wasPlayingBeforeBlurRef.current = false;
        restartPlayback(sound);
        return;
      }

      {
        const activePlaybackId = playbackIdRef.current;
        const isPlayingNow =
          activePlaybackId === null
            ? sound.playing()
            : sound.playing(activePlaybackId);
        wasPlayingBeforeBlurRef.current = isPlayingNow;
        if (isPlayingNow) {
          stopTrackedPlayback(sound);
        }
      }
    };

    globalThis.document.addEventListener("visibilitychange", syncFocusPlayback);
    globalThis.window.addEventListener("blur", syncFocusPlayback);
    globalThis.window.addEventListener("focus", syncFocusPlayback);
    globalThis.window.addEventListener("pagehide", syncFocusPlayback);
    globalThis.window.addEventListener("pageshow", syncFocusPlayback);

    return () => {
      globalThis.document.removeEventListener(
        "visibilitychange",
        syncFocusPlayback,
      );
      globalThis.window.removeEventListener("blur", syncFocusPlayback);
      globalThis.window.removeEventListener("focus", syncFocusPlayback);
      globalThis.window.removeEventListener("pagehide", syncFocusPlayback);
      globalThis.window.removeEventListener("pageshow", syncFocusPlayback);
    };
  }, [restartPlayback, stopTrackedPlayback]);
};
