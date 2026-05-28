import { MAZE_CELL_SIZE } from "@/constants/maze";
import { gridToMazeCells } from "@/lib/maze/grid-to-maze-cells";
import type { CometSample } from "@/lib/maze/maze-canvas-comet";
import { setMazePixiBackgroundColor } from "@/lib/maze/maze-pixi-background";
import {
  getMazePixiPalette,
  type MazeStagePixiPalette,
} from "@/theme/maze-stage-palette";
import type { DemoMazeLevelDto } from "@/types/api/demo";
import type { GameMazeDto, MoveDirection } from "@/types/api/game";
import type { MazeCell } from "@/types/maze";
import { MazePlayMode } from "@/utils/maze/maze-play-mode";
import * as PIXI from "pixi.js";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  createMazeBeaconPixi,
  createMazePlayerPixi,
} from "./maze-canvas-beacon-player";
import { drawCheckerFloor } from "./maze-canvas-floor-draw";
import { PlayerState } from "./maze-canvas-types";
import { drawServerGridBoundaryWalls } from "./maze-canvas-wall-draw";

export interface BuildMazeCanvasSceneRefs {
  goalCellRef: MutableRefObject<{ x: number; y: number }>;
  mazeColsRef: MutableRefObject<number>;
  mazeRowsRef: MutableRefObject<number>;
  isLiveGameRef: MutableRefObject<boolean>;
  pendingLiveMovesRef: MutableRefObject<
    { moveId: string; direction: MoveDirection; movedAt: string }[]
  >;
  mazeRef: MutableRefObject<MazeCell[][]>;
  positionRef: MutableRefObject<{ x: number; y: number }>;
  playerStateRef: MutableRefObject<PlayerState>;
  trailPointsRef: MutableRefObject<Array<{ x: number; y: number }>>;
  cometSamplesRef: MutableRefObject<CometSample[]>;
  junctionLayerRef: MutableRefObject<PIXI.Container | null>;
  trailRef: MutableRefObject<PIXI.Graphics | null>;
  playerRef: MutableRefObject<PIXI.Container | null>;
  playerRollBandRef: MutableRefObject<PIXI.Graphics | null>;
  playerSpecularRef: MutableRefObject<PIXI.Graphics | null>;
  beaconRef: MutableRefObject<PIXI.Container | null>;
  tutorialLayerRef: MutableRefObject<PIXI.Container | null>;
}

export interface MazeCanvasSceneSource {
  readonly liveMaze: GameMazeDto | null;
  readonly demoLevel: DemoMazeLevelDto | null;
}

export function buildMazeCanvasScene(
  app: PIXI.Application,
  playMode: MazePlayMode,
  mazeSourceInput: MazeCanvasSceneSource,
  setMaze: Dispatch<SetStateAction<MazeCell[][]>>,
  refs: BuildMazeCanvasSceneRefs,
  mazePaletteRef: MutableRefObject<MazeStagePixiPalette>,
  showJunctionArrows: (x: number, y: number) => void,
  applyCanvasLayoutRef: MutableRefObject<(() => void) | null>,
): void {
  app.stage.removeChildren();
  switch (playMode) {
    case MazePlayMode.Demo:
    case MazePlayMode.Game:
      break;
    default: {
      const unreachable: never = playMode;
      throw new Error(`Unhandled maze play mode: ${String(unreachable)}`);
    }
  }

  const liveMazeDto =
    playMode === MazePlayMode.Game ? mazeSourceInput.liveMaze : null;
  const demoMazeDto =
    playMode === MazePlayMode.Demo ? mazeSourceInput.demoLevel : null;

  const mazeSource =
    liveMazeDto !== null
      ? {
          mazeGrid: liveMazeDto.mazeGrid,
          generatedMaze: gridToMazeCells(liveMazeDto.mazeGrid),
          mazeCols: liveMazeDto.cols,
          mazeRows: liveMazeDto.rows,
          startCol: liveMazeDto.currentCol,
          startRow: liveMazeDto.currentRow,
          endCol: liveMazeDto.endCol,
          endRow: liveMazeDto.endRow,
          isLive: true as const,
        }
      : demoMazeDto !== null
        ? {
            mazeGrid: demoMazeDto.mazeGrid,
            generatedMaze: gridToMazeCells(demoMazeDto.mazeGrid),
            mazeCols: demoMazeDto.cols,
            mazeRows: demoMazeDto.rows,
            startCol: demoMazeDto.startCol,
            startRow: demoMazeDto.startRow,
            endCol: demoMazeDto.endCol,
            endRow: demoMazeDto.endRow,
            isLive: false as const,
          }
        : null;

  if (mazeSource === null) {
    return;
  }

  const { generatedMaze, mazeCols, mazeRows, startCol, startRow } = mazeSource;
  refs.goalCellRef.current = { x: mazeSource.endCol, y: mazeSource.endRow };
  refs.isLiveGameRef.current = mazeSource.isLive;

  refs.mazeColsRef.current = mazeCols;
  refs.mazeRowsRef.current = mazeRows;
  refs.pendingLiveMovesRef.current = [];

  const mazeW = mazeCols * MAZE_CELL_SIZE;
  const mazeH = mazeRows * MAZE_CELL_SIZE;
  app.renderer.resize(mazeW, mazeH);

  setMaze(generatedMaze);
  refs.mazeRef.current = generatedMaze;
  refs.positionRef.current = { x: startCol, y: startRow };
  refs.playerStateRef.current = PlayerState.IDLE;
  refs.trailPointsRef.current = [
    {
      x: startCol * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2,
      y: startRow * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2,
    },
  ];
  refs.cometSamplesRef.current = [];

  const palette = getMazePixiPalette();
  mazePaletteRef.current = palette;
  setMazePixiBackgroundColor(app.renderer, palette.floor);

  const floorLayer = new PIXI.Container();
  const tutorialLayer = new PIXI.Container();
  const trailLayer = new PIXI.Container();
  const wallLayer = new PIXI.Container();
  const junctionLayer = new PIXI.Container();
  const topLayer = new PIXI.Container();
  app.stage.addChild(
    floorLayer,
    trailLayer,
    wallLayer,
    junctionLayer,
    tutorialLayer,
    topLayer,
  );
  refs.junctionLayerRef.current = junctionLayer;
  refs.tutorialLayerRef.current = tutorialLayer;
  refs.beaconRef.current = null;

  const floor = new PIXI.Graphics();
  drawCheckerFloor(floor, mazeCols, mazeRows, palette);
  floorLayer.addChild(floor);

  const wallGraphics = new PIXI.Graphics();
  wallLayer.addChild(wallGraphics);
  const mazeWidth = mazeW;
  const mazeHeight = mazeH;

  drawServerGridBoundaryWalls(
    wallGraphics,
    mazeSource.mazeGrid,
    mazeCols,
    mazeRows,
    mazeWidth,
    mazeHeight,
    palette,
  );

  const goal = refs.goalCellRef.current;
  const beacon = createMazeBeaconPixi(goal.x, goal.y, palette);
  topLayer.addChild(beacon);
  refs.beaconRef.current = beacon;

  const trail = new PIXI.Graphics();
  trailLayer.addChild(trail);
  refs.trailRef.current = trail;

  const { player, rollBand, specular } = createMazePlayerPixi(
    startCol,
    startRow,
    palette,
  );
  refs.playerRollBandRef.current = rollBand;
  refs.playerSpecularRef.current = specular;
  topLayer.addChild(player);
  refs.playerRef.current = player;

  showJunctionArrows(startCol, startRow);
  queueMicrotask(() => {
    applyCanvasLayoutRef.current?.();
  });
}
