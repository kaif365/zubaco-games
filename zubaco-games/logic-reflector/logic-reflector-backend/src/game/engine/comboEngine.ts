export interface ComboState { currentStreak: number; maxStreak: number; comboMultiplier: number; totalComboBonus: number; }
export interface ComboConfig { bonusPerLevel: number; multiplierStep: number; streakMilestone: number; maxMultiplier: number; }
const DEFAULT_CONFIG: ComboConfig = { bonusPerLevel: 10, multiplierStep: 0.25, streakMilestone: 3, maxMultiplier: 4.0 };
export function createComboState(): ComboState { return { currentStreak: 0, maxStreak: 0, comboMultiplier: 1.0, totalComboBonus: 0 }; }
export function recordHit(state: ComboState, config: Partial<ComboConfig> = {}): ComboState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentStreak = state.currentStreak + 1;
  const maxStreak = Math.max(state.maxStreak, currentStreak);
  let comboMultiplier = 1.0 + Math.floor(currentStreak / cfg.streakMilestone) * cfg.multiplierStep;
  comboMultiplier = Math.min(comboMultiplier, cfg.maxMultiplier);
  const bonus = Math.floor(currentStreak * cfg.bonusPerLevel * comboMultiplier);
  const totalComboBonus = state.totalComboBonus + bonus;
  return { currentStreak, maxStreak, comboMultiplier, totalComboBonus };
}
export function recordMiss(state: ComboState): ComboState { return { ...state, currentStreak: 0, comboMultiplier: 1.0 }; }
export function calculateComboBonus(inputs: boolean[], config: Partial<ComboConfig> = {}): ComboState {
  let state = createComboState();
  for (const correct of inputs) { state = correct ? recordHit(state, config) : recordMiss(state); }
  return state;
}
