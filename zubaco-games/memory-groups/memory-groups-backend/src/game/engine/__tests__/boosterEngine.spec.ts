import { BoosterType, createInventory, activateBooster, isBoosterActive, getBoosterDef } from '../boosterEngine';

describe('BoosterEngine', () => {
  describe('getBoosterDef', () => {
    it('should return definition for each booster type', () => {
      const def = getBoosterDef(BoosterType.TIME_FREEZE);
      expect(def.type).toBe(BoosterType.TIME_FREEZE);
      expect(def.durationMs).toBe(5000);
      expect(def.usesPerGame).toBe(1);
    });
  });

  describe('createInventory', () => {
    it('should create inventory with correct remaining counts', () => {
      const inv = createInventory([BoosterType.HINT, BoosterType.UNDO]);
      expect(inv).toHaveLength(2);
      expect(inv[0].remaining).toBe(2);
      expect(inv[1].remaining).toBe(2);
    });

    it('should initialize with null activation times', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      expect(inv[0].activatedAt).toBeNull();
      expect(inv[0].expiresAt).toBeNull();
    });
  });

  describe('activateBooster', () => {
    it('should decrement remaining on activation', () => {
      const inv = createInventory([BoosterType.HINT]);
      const { success, inventory } = activateBooster(inv, BoosterType.HINT, 1000);
      expect(success).toBe(true);
      expect(inventory[0].remaining).toBe(1);
    });

    it('should set activatedAt and expiresAt for timed boosters', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      const { inventory } = activateBooster(inv, BoosterType.TIME_FREEZE, 1000);
      expect(inventory[0].activatedAt).toBe(1000);
      expect(inventory[0].expiresAt).toBe(6000);
    });

    it('should fail when no remaining uses', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      const { inventory } = activateBooster(inv, BoosterType.TIME_FREEZE, 1000);
      const { success } = activateBooster(inventory, BoosterType.TIME_FREEZE, 2000);
      expect(success).toBe(false);
    });

    it('should fail for non-existent booster', () => {
      const inv = createInventory([BoosterType.HINT]);
      const { success } = activateBooster(inv, BoosterType.SKIP, 1000);
      expect(success).toBe(false);
    });
  });

  describe('isBoosterActive', () => {
    it('should return true while within duration', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      const { inventory } = activateBooster(inv, BoosterType.TIME_FREEZE, 1000);
      expect(isBoosterActive(inventory[0], 3000)).toBe(true);
    });

    it('should return false after expiration', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      const { inventory } = activateBooster(inv, BoosterType.TIME_FREEZE, 1000);
      expect(isBoosterActive(inventory[0], 7000)).toBe(false);
    });

    it('should return false for non-activated booster', () => {
      const inv = createInventory([BoosterType.TIME_FREEZE]);
      expect(isBoosterActive(inv[0], 1000)).toBe(false);
    });
  });
});
