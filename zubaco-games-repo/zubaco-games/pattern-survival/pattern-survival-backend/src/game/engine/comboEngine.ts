/**
 * Combo/Streak scoring engine.
 * Tracks consecutive correct actions and applies multipliers.
 */

export interface ComboState {
  currentStreak: number;
  maxStreak: number;
  comboMultiplier: number;
  totalComboBonus: number;
}

export interface ComboConfig {
  /** Points per streak level (e.g., 10 → +10, +20, +30...) */
  bonusPerLevel: number;
  /** Multiplier increment per streak milestone (every N correct) */
  multiplierStep: number;
  /** How many consecutive corrects to trigger a multiplier increase */
  streakMilestone: number;
  /** Maximum combo multiplier cap */
  maxMultiplier: number;
}

const DEFAULT_CONFIG: ComboConfig = {
  bonusPerLevel: 10,
  multiplierStep: 0.25,
  streakMilestone: 3,
  maxMultiplier: 4.0,
};

export function createComboState(): ComboState {
  return { currentStreak: 0, maxStreak: 0, comboMultiplier: 1.0, totalComboBonus: 0 };
}

export function recordHit(state: ComboState, config: Partial<ComboConfig> = {}): ComboState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentStreak = state.currentStreak + 1;
  const maxStreak = Math.max(state.maxStreak, currentStreak);

  // Multiplier increases at milestones
  let comboMultiplier = 1.0 + Math.floor(currentStreak / cfg.streakMilestone) * cfg.multiplierStep;
  comboMultiplier = Math.min(comboMultiplier, cfg.maxMultiplier);

  // Bonus accumulates with streak level
  const bonus = Math.floor(currentStreak * cfg.bonusPerLevel * comboMultiplier);
  const totalComboBonus = state.totalComboBonus + bonus;

  return { currentStreak, maxStreak, comboMultiplier, totalComboBonus };
}

export function recordMiss(state: ComboState): ComboState {
  return { ...state, currentStreak: 0, comboMultiplier: 1.0 };
}

export function calculateComboBonus(inputs: boolean[], config: Partial<ComboConfig> = {}): ComboState {
  let state = createComboState();
  for (const correct of inputs) {
    state = correct ? recordHit(state, config) : recordMiss(state);
  }
  return state;
}
