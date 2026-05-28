import type { MoveDirection } from "@/types/api/game";
import { Direction } from "@/types/maze";

export function directionToMoveApi(direction: Direction): MoveDirection {
  switch (direction) {
    case Direction.UP:
      return "up";
    case Direction.DOWN:
      return "down";
    case Direction.LEFT:
      return "left";
    case Direction.RIGHT:
      return "right";
    default:
      return "up";
  }
}
