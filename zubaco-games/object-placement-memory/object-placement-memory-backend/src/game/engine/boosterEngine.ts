/**
 * Power-ups / Boosters engine.
 * Manages available boosters and their effects on game sessions.
 */

export enum BoosterType {
  TIME_FREEZE = 'TIME_FREEZE',
  HINT = 'HINT',
  SKIP = 'SKIP',
  DOUBLE_POINTS = 'DOUBLE_POINTS',
  UNDO = 'UNDO',
}

export interface Booster {
  type: BoosterType;
  label: string;
  description: string;
  durationMs: number | null;
  usesPerGame: number;
}

export interface BoosterInventory {
  type: BoosterType;
  remaining: number;
  activatedAt: number | null;
  expiresAt: number | null;
}

const BOOSTER_DEFS: Record<BoosterType, Booster> = {
  [BoosterType.TIME_FREEZE]: {
    type: BoosterType.TIME_FREEZE,
    label: 'Time Freeze',
    description: 'Pause the timer for 5 seconds',
    durationMs: 5000,
    usesPerGame: 1,
  },
  [BoosterType.HINT]: {
    type: BoosterType.HINT,
    label: 'Hint',
    description: 'Reveal a helpful hint',
    durationMs: null,
    usesPerGame: 2,
  },
  [BoosterType.SKIP]: {
    type: BoosterType.SKIP,
    label: 'Skip',
    description: 'Skip the current challenge',
    durationMs: null,
    usesPerGame: 1,
  },
  [BoosterType.DOUBLE_POINTS]: {
    type: BoosterType.DOUBLE_POINTS,
    label: 'Double Points',
    description: 'Earn 2x points for 10 seconds',
    durationMs: 10000,
    usesPerGame: 1,
  },
  [BoosterType.UNDO]: {
    type: BoosterType.UNDO,
    label: 'Undo',
    description: 'Undo the last action',
    durationMs: null,
    usesPerGame: 2,
  },
};

export function getBoosterDef(type: BoosterType): Booster {
  return BOOSTER_DEFS[type];
}

export function createInventory(allowedBoosters: BoosterType[]): BoosterInventory[] {
  return allowedBoosters.map((type) => ({
    type,
    remaining: BOOSTER_DEFS[type].usesPerGame,
    activatedAt: null,
    expiresAt: null,
  }));
}

export function activateBooster(
  inventory: BoosterInventory[],
  type: BoosterType,
  nowMs: number,
): { success: boolean; inventory: BoosterInventory[]; effect: Booster | null } {
  const idx = inventory.findIndex((b) => b.type === type);
  if (idx === -1) return { success: false, inventory, effect: null };

  const booster = inventory[idx]!;
  if (booster.remaining <= 0) return { success: false, inventory, effect: null };

  const def = BOOSTER_DEFS[type];
  const updated = [...inventory];
  updated[idx] = {
    ...booster,
    remaining: booster.remaining - 1,
    activatedAt: nowMs,
    expiresAt: def.durationMs ? nowMs + def.durationMs : null,
  };

  return { success: true, inventory: updated, effect: def };
}

export function isBoosterActive(booster: BoosterInventory, nowMs: number): boolean {
  if (!booster.activatedAt) return false;
  if (!booster.expiresAt) return false;
  return nowMs < booster.expiresAt;
}
