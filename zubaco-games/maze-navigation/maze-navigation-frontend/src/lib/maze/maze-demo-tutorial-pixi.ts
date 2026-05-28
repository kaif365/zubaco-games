import { MAZE_BALL_SIZE, MAZE_CELL_SIZE } from "@/constants/maze";
import { PIXI_COLOR } from "@/theme/color";
import type { DemoTutorialStep } from "@/utils/maze/demo-tutorial";
import type { MazePathCell } from "@/utils/maze/find-shortest-path";
import { gsap } from "gsap";
import * as PIXI from "pixi.js";

export interface DemoTutorialPixiHandles {
  playerGlow: PIXI.Graphics | null;
  pathLayer: PIXI.Graphics | null;
  beaconEmphasis: PIXI.Graphics | null;
  glowTween: gsap.core.Tween | null;
  pathTween: gsap.core.Tween | null;
  beaconTween: gsap.core.Tween | null;
}

export function createEmptyDemoTutorialPixiHandles(): DemoTutorialPixiHandles {
  return {
    playerGlow: null,
    pathLayer: null,
    beaconEmphasis: null,
    glowTween: null,
    pathTween: null,
    beaconTween: null,
  };
}

export function disposeDemoTutorialPixiHandles(
  handles: DemoTutorialPixiHandles,
): void {
  handles.glowTween?.kill();
  handles.pathTween?.kill();
  handles.beaconTween?.kill();
  handles.glowTween = null;
  handles.pathTween = null;
  handles.beaconTween = null;

  if (handles.playerGlow) {
    gsap.killTweensOf(handles.playerGlow);
    handles.playerGlow.parent?.removeChild(handles.playerGlow);
    handles.playerGlow.destroy();
    handles.playerGlow = null;
  }

  if (handles.pathLayer) {
    gsap.killTweensOf(handles.pathLayer);
    handles.pathLayer.parent?.removeChild(handles.pathLayer);
    handles.pathLayer.destroy();
    handles.pathLayer = null;
  }

  if (handles.beaconEmphasis) {
    const beaconParent = handles.beaconEmphasis.parent;
    gsap.killTweensOf(handles.beaconEmphasis);
    gsap.killTweensOf(handles.beaconEmphasis.scale);
    if (beaconParent) {
      gsap.killTweensOf(beaconParent);
      gsap.killTweensOf(beaconParent.scale);
      beaconParent.scale.set(1);
    }
    handles.beaconEmphasis.parent?.removeChild(handles.beaconEmphasis);
    handles.beaconEmphasis.destroy();
    handles.beaconEmphasis = null;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function drawPathCellHighlight(
  graphics: PIXI.Graphics,
  row: number,
  col: number,
): void {
  const x = col * MAZE_CELL_SIZE;
  const y = row * MAZE_CELL_SIZE;
  const inset = 1;
  const size = MAZE_CELL_SIZE - inset * 2;

  graphics.beginFill(PIXI_COLOR.tutorialInner, 0.3);
  graphics.drawRect(x + inset, y + inset, size, size);
  graphics.endFill();

  graphics.lineStyle(3, PIXI_COLOR.tutorialOuter, 0.95);
  graphics.drawRect(x + inset, y + inset, size, size);

  graphics.lineStyle(1.5, PIXI_COLOR.tutorialInner, 0.8);
  graphics.drawRect(x + 4, y + 4, size - 6, size - 6);
}

export function applyDemoTutorialPixiStep(
  step: DemoTutorialStep,
  options: {
    player: PIXI.Container | null;
    beacon: PIXI.Container | null;
    tutorialLayer: PIXI.Container | null;
    pathCells: MazePathCell[];
    handles: DemoTutorialPixiHandles;
  },
): void {
  const { player, beacon, tutorialLayer, pathCells, handles } = options;

  disposeDemoTutorialPixiHandles(handles);

  const reducedMotion = prefersReducedMotion();

  if (step === "ball" && player) {
    const glow = new PIXI.Graphics();
    glow.lineStyle(2.5, PIXI_COLOR.tutorialOuter, 0.9);
    glow.drawCircle(0, 0, MAZE_BALL_SIZE * 1.55);
    glow.lineStyle(1.2, PIXI_COLOR.tutorialInner, 0.6);
    glow.drawCircle(0, 0, MAZE_BALL_SIZE * 2.05);
    player.addChildAt(glow, 0);
    handles.playerGlow = glow;

    if (!reducedMotion) {
      handles.glowTween = gsap.fromTo(
        glow,
        { alpha: 0.55 },
        {
          alpha: 1,
          duration: 1.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
    }
    return;
  }

  if (step === "path" && tutorialLayer && pathCells.length > 0) {
    const pathGraphics = new PIXI.Graphics();
    for (const [row, col] of pathCells) {
      drawPathCellHighlight(pathGraphics, row, col);
    }
    tutorialLayer.addChild(pathGraphics);
    handles.pathLayer = pathGraphics;

    if (!reducedMotion) {
      handles.pathTween = gsap.fromTo(
        pathGraphics,
        { alpha: 0.45 },
        {
          alpha: 1,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
    }
    return;
  }

  if (step === "portal" && beacon) {
    const emphasis = new PIXI.Graphics();
    emphasis.lineStyle(3.2, PIXI_COLOR.tutorialOuter, 1);
    emphasis.drawCircle(0, 0, MAZE_CELL_SIZE * 0.34);
    emphasis.lineStyle(2, PIXI_COLOR.tutorialInner, 0.92);
    emphasis.drawCircle(0, 0, MAZE_CELL_SIZE * 0.48);
    emphasis.lineStyle(1.5, PIXI_COLOR.tutorialOuter, 0.6);
    emphasis.drawCircle(0, 0, MAZE_CELL_SIZE * 0.62);
    beacon.addChild(emphasis);
    handles.beaconEmphasis = emphasis;

    if (!reducedMotion) {
      handles.beaconTween = gsap.fromTo(
        emphasis.scale,
        { x: 0.88, y: 0.88 },
        {
          x: 1.22,
          y: 1.22,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
      gsap.fromTo(
        emphasis,
        { alpha: 0.55 },
        {
          alpha: 1,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
      gsap.fromTo(
        beacon.scale,
        { x: 1, y: 1 },
        {
          x: 1.12,
          y: 1.12,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
    }
  }
}
