"use client";

import {
  InfinityLoopScene,
  INFINITY_TILE_RENDER_TYPE,
  type InfinityTileRenderType,
} from "@/lib/game/phaser/InfinityLoopScene";
import type { InfinityTileCell } from "@/types/games/infinity-loop/infinity-loop-board-editor";
import * as Phaser from "phaser";
import { useEffect, useRef } from "react";

interface InfinityPhaserLoopGridProps {
  readonly grid: InfinityTileCell[][];
  readonly onTileClick?: (x: number, y: number) => void;
  readonly className?: string;
  readonly animateTileEntrance?: boolean;
  readonly tileType?: InfinityTileRenderType;
  readonly forceMobileViewport?: boolean;
}

const PREVIEW_THEME = {
  primary: "#22F5FF",
  glow: "rgba(34, 245, 255, 0.95)",
  background: "#040814",
};

export const InfinityPhaserLoopGrid = ({
  grid,
  onTileClick,
  className,
  animateTileEntrance = true,
  tileType = INFINITY_TILE_RENDER_TYPE.OUTLINE,
  forceMobileViewport = true,
}: InfinityPhaserLoopGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 800;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      transparent: true,
      antialias: true,
      autoRound: true,
      pixelArt: false,
      render: {
        antialiasGL: true,
        roundPixels: true,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    game.scene.add("InfinityLoopScene", InfinityLoopScene);
    game.scene.start("InfinityLoopScene", {
      grid,
      onTileRotate: onTileClick,
      colors: PREVIEW_THEME,
      animateTileEntrance,
      tileType,
      forceMobileViewport,
    });

    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        gameRef.current.scale.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameRef.current?.isBooted || !containerRef.current) return;
    gameRef.current.scale.resize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    );

    const updateScene = () => {
      const scene = gameRef.current?.scene.getScene("InfinityLoopScene") as
        | InfinityLoopScene
        | undefined;
      if (scene) {
        scene.updateGrid(
          grid,
          PREVIEW_THEME,
          onTileClick,
          animateTileEntrance,
          tileType,
          forceMobileViewport,
        );
      } else if (gameRef.current) {
        setTimeout(updateScene, 50);
      }
    };

    updateScene();
  }, [animateTileEntrance, forceMobileViewport, grid, onTileClick, tileType]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
};
