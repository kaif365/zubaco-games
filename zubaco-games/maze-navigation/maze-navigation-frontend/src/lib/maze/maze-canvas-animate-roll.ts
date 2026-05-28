import { Direction } from "@/types/maze";
import { gsap } from "gsap";
import type * as PIXI from "pixi.js";

export function animatePlayerRoll(
  player: PIXI.Container,
  rollBand: PIXI.Graphics,
  specular: PIXI.Graphics,
  direction: Direction,
): void {
  const isVertical = direction === Direction.UP || direction === Direction.DOWN;
  const directionSign =
    direction === Direction.UP || direction === Direction.LEFT ? -1 : 1;

  gsap.killTweensOf(rollBand);
  gsap.killTweensOf(specular);

  gsap.to(rollBand, {
    rotation: isVertical ? 0 : Math.PI / 2,
    duration: 0.05,
    ease: "none",
    overwrite: "auto",
  });

  gsap.fromTo(
    rollBand,
    { y: 3 * directionSign },
    {
      y: -3 * directionSign,
      duration: 0.15,
      ease: "none",
      overwrite: "auto",
    },
  );
  gsap.fromTo(
    specular,
    { x: -2 * directionSign, y: -2 * directionSign },
    {
      x: 2 * directionSign,
      y: 2 * directionSign,
      duration: 0.15,
      ease: "none",
      overwrite: "auto",
    },
  );
  gsap.fromTo(
    player,
    { rotation: -directionSign * 0.05 },
    {
      rotation: directionSign * 0.05,
      duration: 0.15,
      ease: "none",
      overwrite: "auto",
    },
  );
}
