"use client";

import {
  GAME_GRID_FRAME_HEIGHT_CLASS,
  GAME_GRID_FRAME_WIDTH_CLASS,
} from "@/components/organisms/game-grid-frame";
import { logger } from "@/lib/default-logger";
import { LoopScene } from "@/lib/game/phaser/loop-scene";
import { GridCell } from "@/types/tile";
import { TILE_RENDER_TYPE, TileRenderType } from "@/types/tile-render";
import * as Phaser from "phaser";
import { useEffect, useRef } from "react";

interface Props {
  readonly grid: GridCell[][];
  readonly theme: { primary: string; glow: string; background: string };
  readonly onTileClick: (x: number, y: number) => void;
  readonly animateTileEntrance?: boolean;
  readonly mobileInsetScaleOverride?: number | null;
  readonly tileType?: TileRenderType;
}

export const PhaserGameGrid = ({
  grid,
  theme,
  onTileClick,
  animateTileEntrance = true,
  mobileInsetScaleOverride = null,
  tileType = TILE_RENDER_TYPE.FILLED,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gridRef = useRef(grid);
  const onTileClickRef = useRef(onTileClick);
  const themeRef = useRef(theme);
  const animateTileEntranceRef = useRef(animateTileEntrance);
  const mobileInsetScaleOverrideRef = useRef(mobileInsetScaleOverride);
  const tileTypeRef = useRef(tileType);

  useEffect(() => {
    gridRef.current = grid;
    onTileClickRef.current = onTileClick;
    themeRef.current = theme;
    animateTileEntranceRef.current = animateTileEntrance;
    mobileInsetScaleOverrideRef.current = mobileInsetScaleOverride;
    tileTypeRef.current = tileType;
  }, [
    animateTileEntrance,
    grid,
    mobileInsetScaleOverride,
    onTileClick,
    theme,
    tileType,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Wait a tiny bit for layout if needed, though clientWidth should be available
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 800;
    logger.info("Initializing Phaser with size:", { width, height });

    if (!Phaser.Game) {
      logger.error("Phaser namespace is invalid:", Phaser);
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: width,
      height: height,
      backgroundColor: "#00000000",
      canvasStyle: "background-color: transparent;",
      transparent: true,
      antialias: true,
      autoRound: true,
      pixelArt: false,
      render: {
        antialiasGL: true,
        roundPixels: true,
      },
    };

    try {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      if (game.canvas) {
        game.canvas.style.backgroundColor = "transparent";
      }
      logger.info("Phaser Game instance created");

      // Explicitly add and start the scene to pass data correctly
      game.scene.add("LoopScene", LoopScene);
      game.scene.start("LoopScene", {
        grid: gridRef.current,
        onTileRotate: onTileClickRef.current,
        colors: themeRef.current,
        animateTileEntrance: animateTileEntranceRef.current,
        mobileInsetScaleOverride: mobileInsetScaleOverrideRef.current,
        tileType: tileTypeRef.current,
      });
    } catch (err) {
      logger.error("Failed to create Phaser game:", err);
    }

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
    };
  }, []);

  // Sync with Phaser when external state changes
  useEffect(() => {
    if (gameRef.current && containerRef.current) {
      gameRef.current.scale.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      );
    }

    const updateScene = () => {
      const scene = gameRef.current?.scene.getScene("LoopScene") as LoopScene;
      if (scene) {
        scene.updateGrid(
          grid,
          theme,
          onTileClick,
          animateTileEntrance,
          mobileInsetScaleOverride,
          tileType,
        );
      } else if (gameRef.current) {
        // If game exists but scene isn't ready, try again shortly
        setTimeout(updateScene, 50);
      }
    };
    updateScene();
  }, [
    animateTileEntrance,
    grid,
    theme,
    onTileClick,
    mobileInsetScaleOverride,
    tileType,
  ]);

  return (
    <div
      ref={containerRef}
      className={`mx-auto relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-transparent ${GAME_GRID_FRAME_WIDTH_CLASS} ${GAME_GRID_FRAME_HEIGHT_CLASS}`}
      style={{
        backgroundColor: "transparent",
        boxShadow: `0 0 30px ${theme.primary}33, 0 0 70px ${theme.primary}14`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 animate-neon-breath"
        style={{
          borderColor: `${theme.primary}55`,
          boxShadow: `0 0 40px ${theme.primary}55, 0 0 90px ${theme.primary}22`,
        }}
      />
    </div>
  );
};
