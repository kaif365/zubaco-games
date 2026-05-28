import type { DemoLevel } from '@/types/logic-reflector';
import { LEVELS } from './levels';

export const demoCount = 2;

export const demoLevels: DemoLevel[] = [
  {
    levelName: 'Logic Reflector demo',
    levels: LEVELS.slice(0, demoCount),
  },
];
