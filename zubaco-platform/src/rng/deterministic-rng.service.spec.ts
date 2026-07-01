import { DeterministicRng, DeterministicRngService } from './deterministic-rng.service';

/**
 * Unit tests for the deterministic RNG — the provably-fair core.
 * The critical guarantee: identical seed material reproduces an identical
 * stream (server-side board generation + replay validation), while different
 * seeds diverge. Pure and dependency-free.
 */
describe('DeterministicRng', () => {
  const draws = (seed: string, n: number) => {
    const rng = new DeterministicRng(seed);
    return Array.from({ length: n }, () => rng.nextUint32());
  };

  describe('reproducibility', () => {
    it('produces an identical stream for identical seed material', () => {
      expect(draws('seed-A', 20)).toEqual(draws('seed-A', 20));
    });

    it('produces a different stream for different seed material', () => {
      expect(draws('seed-A', 20)).not.toEqual(draws('seed-B', 20));
    });

    it('emits unsigned 32-bit integers', () => {
      for (const v of draws('bounds', 50)) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it('emits floats in the [0, 1) range', () => {
      const rng = new DeterministicRng('floats');
      for (let i = 0; i < 100; i++) {
        const f = rng.next();
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(1);
      }
    });
  });

  describe('intBetween', () => {
    it('always returns a value within the inclusive range', () => {
      const rng = new DeterministicRng('range');
      for (let i = 0; i < 500; i++) {
        const v = rng.intBetween(1, 6);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
      }
    });

    it('can reach both range endpoints over many draws', () => {
      const rng = new DeterministicRng('endpoints');
      const seen = new Set<number>();
      for (let i = 0; i < 500; i++) seen.add(rng.intBetween(1, 3));
      expect(seen.has(1)).toBe(true);
      expect(seen.has(3)).toBe(true);
    });

    it('returns min when max <= min (degenerate range)', () => {
      const rng = new DeterministicRng('degenerate');
      expect(rng.intBetween(5, 5)).toBe(5);
      expect(rng.intBetween(10, 1)).toBe(10);
    });
  });

  describe('shuffle', () => {
    it('shuffles deterministically for the same seed', () => {
      const a = new DeterministicRng('shuf').shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
      const b = new DeterministicRng('shuf').shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(a).toEqual(b);
    });

    it('preserves all elements (is a permutation)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = new DeterministicRng('perm').shuffle([...original]);
      expect([...shuffled].sort((x, y) => x - y)).toEqual(original);
    });
  });

  describe('pick', () => {
    it('returns an element from the provided array', () => {
      const arr = ['a', 'b', 'c', 'd'];
      const rng = new DeterministicRng('pick');
      for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
    });
  });
});

describe('DeterministicRngService', () => {
  let service: DeterministicRngService;

  beforeEach(() => {
    service = new DeterministicRngService();
  });

  describe('buildSeedMaterial', () => {
    it('joins all seed components with the "::" separator', () => {
      expect(service.buildSeedMaterial('srv', 'cli', 5, 'hash')).toBe('srv::cli::5::hash');
    });

    it('substitutes empty strings for missing optional components', () => {
      expect(service.buildSeedMaterial('srv')).toBe('srv::::0::');
    });
  });

  describe('create', () => {
    it('yields identical streams for identical session inputs', () => {
      const a = service.create('srv', 'cli', 1, 'h');
      const b = service.create('srv', 'cli', 1, 'h');
      expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
    });

    it('diverges when the nonce changes', () => {
      const a = service.create('srv', 'cli', 1);
      const b = service.create('srv', 'cli', 2);
      expect(a.nextUint32()).not.toBe(b.nextUint32());
    });
  });

  describe('fingerprint', () => {
    it('is stable for equal values and 32 hex chars long', () => {
      const fp = service.fingerprint({ board: [1, 2, 3] });
      expect(fp).toHaveLength(32);
      expect(fp).toMatch(/^[0-9a-f]{32}$/);
      expect(service.fingerprint({ board: [1, 2, 3] })).toBe(fp);
    });

    it('differs for different values (tamper detection)', () => {
      expect(service.fingerprint({ board: [1, 2, 3] })).not.toBe(
        service.fingerprint({ board: [3, 2, 1] }),
      );
    });
  });
});
