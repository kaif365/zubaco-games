import { MAZE_BALL_SIZE, MAZE_CELL_SIZE } from "@/constants/maze";
import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import { gsap } from "gsap";
import * as PIXI from "pixi.js";

export function createMazeBeaconPixi(
  goalX: number,
  goalY: number,
  palette: MazeStagePixiPalette,
): PIXI.Container {
  const beacon = new PIXI.Container();
  beacon.x = goalX * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
  beacon.y = goalY * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
  const beaconCenter = new PIXI.Graphics();
  beaconCenter.lineStyle(2.4, palette.beaconInner, 0.95);
  beaconCenter.drawCircle(0, 0, 11.5);
  beacon.addChild(beaconCenter);

  const loopCount = 3;
  const loopRadius = MAZE_CELL_SIZE * 0.28;
  const rippleDuration = 2.4;
  const rippleDelay = rippleDuration / loopCount;

  gsap.fromTo(
    beaconCenter.scale,
    { x: 0.94, y: 0.94 },
    {
      x: 1.08,
      y: 1.08,
      duration: rippleDuration,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    },
  );

  for (let index = 0; index < loopCount; index += 1) {
    const loop = new PIXI.Graphics();
    loop.lineStyle(1.8, palette.beaconOuter, 0.7);
    loop.drawCircle(0, 0, loopRadius);
    loop.alpha = 0;
    loop.scale.set(0.82);
    beacon.addChild(loop);

    gsap.fromTo(
      loop.scale,
      { x: 0.82, y: 0.82 },
      {
        x: 3.05,
        y: 3.05,
        duration: rippleDuration,
        repeat: -1,
        ease: "sine.out",
        delay: index * rippleDelay,
      },
    );
    gsap.fromTo(
      loop,
      { alpha: 0.7 },
      {
        alpha: 0,
        duration: rippleDuration,
        repeat: -1,
        ease: "sine.out",
        delay: index * rippleDelay,
      },
    );
  }

  return beacon;
}

export interface MazePlayerPixiParts {
  player: PIXI.Container;
  rollBand: PIXI.Graphics;
  specular: PIXI.Graphics;
}

export function createMazePlayerPixi(
  startCol: number,
  startRow: number,
  palette: MazeStagePixiPalette,
): MazePlayerPixiParts {
  const player = new PIXI.Container();
  player.x = startCol * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
  player.y = startRow * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;

  const playerBody = new PIXI.Graphics();
  playerBody.beginFill(palette.playerBase);
  playerBody.drawCircle(0, 0, MAZE_BALL_SIZE);
  playerBody.endFill();
  playerBody.beginFill(palette.playerBase, 0.36);
  playerBody.drawCircle(2.6, 3.1, MAZE_BALL_SIZE * 0.86);
  playerBody.endFill();
  playerBody.beginFill(palette.playerCore, 0.96);
  playerBody.drawCircle(-3.2, -3.6, MAZE_BALL_SIZE * 0.56);
  playerBody.endFill();
  playerBody.beginFill(palette.playerCore, 0.22);
  playerBody.drawCircle(-1.1, -1.2, MAZE_BALL_SIZE * 0.82);
  playerBody.endFill();
  playerBody.lineStyle(1.5, palette.playerSpecular, 0.18);
  playerBody.drawCircle(0, 0, MAZE_BALL_SIZE * 0.95);
  playerBody.lineStyle(0);

  const playerMask = new PIXI.Graphics();
  playerMask.beginFill(0xffffff);
  playerMask.drawCircle(0, 0, MAZE_BALL_SIZE);
  playerMask.endFill();

  const playerShade = new PIXI.Graphics();
  playerShade.beginFill(palette.playerBase, 0.28);
  playerShade.drawEllipse(
    MAZE_BALL_SIZE * 0.24,
    MAZE_BALL_SIZE * 0.2,
    MAZE_BALL_SIZE * 0.92,
    MAZE_BALL_SIZE * 0.62,
  );
  playerShade.endFill();
  playerShade.mask = playerMask;

  const rollBand = new PIXI.Graphics();
  rollBand.lineStyle(2.2, palette.playerSpecular, 0.28);
  rollBand.drawEllipse(0, 0, MAZE_BALL_SIZE * 0.75, MAZE_BALL_SIZE * 0.35);
  rollBand.lineStyle(1.1, palette.playerSpecular, 0.16);
  rollBand.drawEllipse(0, 0, MAZE_BALL_SIZE * 0.48, MAZE_BALL_SIZE * 0.18);
  rollBand.mask = playerMask;

  const specular = new PIXI.Graphics();
  specular.beginFill(palette.playerSpecular, 0.88);
  specular.drawCircle(-2.8, -2.9, 2);
  specular.endFill();
  specular.beginFill(palette.playerSpecular, 0.46);
  specular.drawCircle(-4.5, -4.7, 1.1);
  specular.endFill();

  player.addChild(playerBody);
  player.addChild(playerShade);
  player.addChild(rollBand);
  player.addChild(specular);
  player.addChild(playerMask);

  return { player, rollBand, specular };
}
