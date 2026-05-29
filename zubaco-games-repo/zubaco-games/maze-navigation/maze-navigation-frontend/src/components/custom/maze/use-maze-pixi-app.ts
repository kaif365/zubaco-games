import { MAZE_CELL_SIZE } from "@/constants/maze";
import {
  appendCometSample,
  COMET_MIN_SAMPLE_DIST_PX,
  drawCometTrailGraphics,
  pruneExpiredCometSamples,
  type CometSample,
} from "@/lib/maze/maze-canvas-comet";
import { useDemoStore } from "@/store/demo";
import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import { Direction } from "@/types/maze";
import { isDemoTutorialInputBlocked } from "@/utils/maze/demo-tutorial";
import * as PIXI from "pixi.js";
import type { RefObject } from "react";
import { useEffect } from "react";
import { MAX_MAZE_DIM, type MazeMoveEventDetail } from "./maze-canvas-types";

export function useMazePixiApp(
  containerRef: RefObject<HTMLDivElement | null>,
  appRef: RefObject<PIXI.Application | null>,
  applyCanvasLayoutRef: RefObject<(() => void) | null>,
  handleMoveRef: RefObject<(direction: string | Direction) => void>,
  trailRef: RefObject<PIXI.Graphics | null>,
  playerRef: RefObject<PIXI.Container | null>,
  cometSamplesRef: RefObject<CometSample[]>,
  mazePaletteRef: RefObject<MazeStagePixiPalette>,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const app = new PIXI.Application({
      width: MAX_MAZE_DIM * MAZE_CELL_SIZE,
      height: MAX_MAZE_DIM * MAZE_CELL_SIZE,
      backgroundColor: mazePaletteRef.current.floor,
      antialias: true,
      resolution: 1,
      autoDensity: false,
    });

    container.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const applyCanvasLayout = () => {
      if (!containerRef.current || !appRef.current) {
        return;
      }
      const parent = containerRef.current.parentElement;
      if (!parent) {
        return;
      }
      const canvas = appRef.current.view as HTMLCanvasElement;
      const sw = appRef.current.screen.width;
      const sh = appRef.current.screen.height;
      if (sw <= 0 || sh <= 0) {
        return;
      }
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      if (parentWidth <= 0 || parentHeight <= 0) {
        return;
      }
      /** Small visual safe margin (2px per side) so outermost walls don't clip under panel border-radius. */
      const margin = 4;
      const safeWidth = Math.max(0, parentWidth - margin);
      const safeHeight = Math.max(0, parentHeight - margin);

      /** Fill play area width and height safely; fit the aspect ratio within both bounds. */
      const scale = Math.min(safeWidth / sw, safeHeight / sh);
      canvas.style.width = `${sw * scale}px`;
      canvas.style.height = `${sh * scale}px`;
      canvas.style.display = "block";
    };

    const triggerLayoutUpdate = () => {
      applyCanvasLayout();

      requestAnimationFrame(() => {
        applyCanvasLayout();
      });

      const delays = [50, 150, 300, 600];
      delays.forEach((delay) => {
        setTimeout(applyCanvasLayout, delay);
      });
    };

    applyCanvasLayoutRef.current = triggerLayoutUpdate;

    const shouldBlockTutorialInput = () =>
      isDemoTutorialInputBlocked(useDemoStore.getState().demoTutorialStep);

    const handleCustomMove = (event: Event) => {
      if (shouldBlockTutorialInput()) {
        return;
      }
      const mazeEvent = event as CustomEvent<MazeMoveEventDetail>;
      handleMoveRef.current(mazeEvent.detail.direction);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockTutorialInput()) {
        return;
      }
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleMoveRef.current(Direction.UP);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleMoveRef.current(Direction.DOWN);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handleMoveRef.current(Direction.LEFT);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handleMoveRef.current(Direction.RIGHT);
          break;
        default:
          break;
      }
    };

    window.addEventListener("resize", triggerLayoutUpdate);
    window.addEventListener("orientationchange", triggerLayoutUpdate);
    window.addEventListener("maze-move", handleCustomMove);
    window.addEventListener("keydown", handleKeyDown);

    let resizeObserver: ResizeObserver | null = null;
    const parentEl = container.parentElement;
    if (parentEl) {
      resizeObserver = new ResizeObserver(() => {
        triggerLayoutUpdate();
      });
      resizeObserver.observe(parentEl);
    }

    let hammerManager: {
      get: (name: string) => { set: (options: { direction: number }) => void };
      on: (events: string, handler: (event: { type: string }) => void) => void;
      destroy: () => void;
    } | null = null;
    void import("hammerjs").then(({ default: Hammer }) => {
      hammerManager = new Hammer(container);
      hammerManager.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
      hammerManager.on("swipeup swipedown swipeleft swiperight", (event) => {
        if (shouldBlockTutorialInput()) {
          return;
        }
        if (event.type === "swipeup") {
          handleMoveRef.current(Direction.UP);
        }
        if (event.type === "swipedown") {
          handleMoveRef.current(Direction.DOWN);
        }
        if (event.type === "swipeleft") {
          handleMoveRef.current(Direction.LEFT);
        }
        if (event.type === "swiperight") {
          handleMoveRef.current(Direction.RIGHT);
        }
      });
    });

    app.ticker.add(() => {
      const trail = trailRef.current;
      if (!trail) {
        return;
      }

      trail.clear();

      const player = playerRef.current;
      const samples = cometSamplesRef.current;
      const now = performance.now();
      const minDistSq = COMET_MIN_SAMPLE_DIST_PX * COMET_MIN_SAMPLE_DIST_PX;

      if (player) {
        appendCometSample(samples, player, now, minDistSq);
      }

      pruneExpiredCometSamples(samples, now);
      drawCometTrailGraphics(trail, samples, now, mazePaletteRef.current);
    });

    triggerLayoutUpdate();

    return () => {
      applyCanvasLayoutRef.current = null;
      window.removeEventListener("resize", triggerLayoutUpdate);
      window.removeEventListener("orientationchange", triggerLayoutUpdate);
      window.removeEventListener(
        "maze-move",
        handleCustomMove as EventListener,
      );
      window.removeEventListener("keydown", handleKeyDown);
      resizeObserver?.disconnect();
      hammerManager?.destroy();
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
    // Refs are stable; mount PIXI once like the original component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
