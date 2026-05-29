import type { IRenderer } from "pixi.js";

/** Safe background update for Pixi v7 (BackgroundSystem may be null after destroy). */
export function setMazePixiBackgroundColor(
  renderer: IRenderer,
  color: number,
): void {
  if (renderer.background) {
    renderer.background.color = color;
    return;
  }
  const legacy = renderer as IRenderer & { backgroundColor?: number };
  if (typeof legacy.backgroundColor === "number") {
    legacy.backgroundColor = color;
  }
}
