"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { GAME_EVENTS } from "@/game/gameTypes";

export interface PhaserGameHandle {
  retry: () => void;
  next: () => void;
  goto: (idx: number) => void;
  guides: () => void;
  hint: () => void;
  autoplay: () => void;
  setZoom: (val: number) => void;
}

const PhaserGame = forwardRef<PhaserGameHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose control surface to parent
  useImperativeHandle(ref, () => ({
    retry: () => window.dispatchEvent(new CustomEvent(GAME_EVENTS.CMD_RETRY)),
    next: () => window.dispatchEvent(new CustomEvent(GAME_EVENTS.CMD_NEXT)),
    goto: (idx) =>
      window.dispatchEvent(
        new CustomEvent(GAME_EVENTS.CMD_GOTO, { detail: idx }),
      ),
    guides: () => window.dispatchEvent(new CustomEvent(GAME_EVENTS.CMD_GUIDES)),
    hint: () => window.dispatchEvent(new CustomEvent(GAME_EVENTS.CMD_HINT)),
    autoplay: () =>
      window.dispatchEvent(new CustomEvent(GAME_EVENTS.CMD_AUTOPLAY)),
    setZoom: (val) =>
      window.dispatchEvent(
        new CustomEvent(GAME_EVENTS.CMD_ZOOM, { detail: val }),
      ),
  }));

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let game: any = null;

    (async () => {
      const Phaser = await import("phaser");
      const { GameScene } = await import("@/game/GameScene");
      if (cancelled || !containerRef.current) return;

      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: w,
        height: h,
        transparent: true,
        parent: containerRef.current,
        scene: [GameScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: { antialias: true, antialiasGL: true },
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy?.(true);
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
});

PhaserGame.displayName = "PhaserGame";
export default PhaserGame;
