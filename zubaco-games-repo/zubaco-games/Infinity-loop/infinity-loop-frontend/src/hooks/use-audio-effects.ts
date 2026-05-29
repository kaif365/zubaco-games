// /modules/game/hooks/use-audio-effects.ts
"use client";

import { DEFAULT_GAME_CONFIG } from "@/config/game-config";
import { Howl, Howler } from "howler";
import { useCallback, useEffect, useRef } from "react";

const { tapSoundUrl, successSoundUrl } = DEFAULT_GAME_CONFIG.settings.audio;

export const useAudio = (enabled: boolean, volume: number) => {
  const tapRef = useRef<Howl | null>(null);
  const successRef = useRef<Howl | null>(null);

  useEffect(() => {
    // html5: true matches background music in @/hooks/use-audio; WebAudio decode on remote
    // short SFX is brittle across Safari / autoplay, and 404/codec issues are silent.
    const tap = new Howl({
      src: [tapSoundUrl],
      volume,
      html5: true,
      preload: true,
      onplayerror: function () {
        tap.once("unlock", function () {
          tap.play();
        });
      },
    });
    const success = new Howl({
      src: [successSoundUrl],
      volume: Math.min(1, volume * 1.5),
      html5: true,
      preload: true,
      onplayerror: function () {
        success.once("unlock", function () {
          success.play();
        });
      },
    });
    tapRef.current = tap;
    successRef.current = success;

    return () => {
      tapRef.current?.unload();
      successRef.current?.unload();
    };
  }, [volume]);

  const playTap = useCallback(() => {
    if (!enabled || !tapRef.current) return;
    if (Howler.ctx?.state === "suspended") {
      void Howler.ctx.resume();
    }
    // Restart tap on each interaction so quick consecutive taps stay audible.
    tapRef.current.stop();
    tapRef.current.play();
  }, [enabled]);

  const playSuccess = useCallback(() => {
    if (enabled) successRef.current?.play();
  }, [enabled]);

  return { playTap, playSuccess };
};
