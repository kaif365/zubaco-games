import { mulberry32 } from './random';
import type { Circle } from '../../../types/game';


export function generateCircle(rng: () => number, id: number, timestamp: number): Circle {
  const x = 10 + rng() * 80;
  const y = 10 + rng() * 80;
  const colorRoll = rng();
  // ~40% green, 20% red, 20% blue, 20% yellow
  const color: Circle['color'] = colorRoll < 0.4 ? 'green' : colorRoll < 0.6 ? 'red' : colorRoll < 0.8 ? 'blue' : 'yellow';
  return { id, x, y, color, spawnedAt: timestamp };
}

export { mulberry32 };
