/**
 * SECTION D — ANTI-CHEAT (DATABASE-BACKED integration, Phase T4-A)
 *
 * Real anti-cheat detection (AntiCheatService) and the single authoritative
 * enforcement engine (EnforcementService) against a REAL PostgreSQL + Redis.
 * Verifies flag creation/persistence, auto-ban on repeated critical flags,
 * atomic ban + refresh-token purge, leaderboard removal, idempotency and the
 * reversal (un-ban) path.
 */
import { Harness, startHarness } from './harness';
import { createUser, SAMPLE_GAME } from './prisma-test-util';
import { EnforcementAction } from '../../../src/anti-cheat/enforcement/enforcement.types';

describe('Anti-Cheat — DB integration', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  });

  afterAll(async () => {
    await h.stop();
  });

  beforeEach(async () => {
    await h.reset();
  });

  describe('flag detection & persistence', () => {
    it('persists a CRITICAL IMPOSSIBLE_SCORE flag for a superhuman score', async () => {
      const { id } = await createUser(h.graph.prisma);

      const res = await h.graph.antiCheat.analyzeGameResult(
        id,
        'sess-1',
        999999, // SLIDING_PUZZLE max is 2000
        60000,
        SAMPLE_GAME,
        {},
      );
      expect(res.flags_raised).toBeGreaterThanOrEqual(1);

      const flags = await h.graph.prisma.cheatFlag.findMany({ where: { user_id: id } });
      expect(flags.some((f) => f.flag_type === 'IMPOSSIBLE_SCORE' && f.severity === 'CRITICAL')).toBe(true);
    });
  });

  describe('automatic enforcement', () => {
    it('auto-bans a user after 3 critical flags and purges refresh tokens', async () => {
      const { id } = await createUser(h.graph.prisma);
      await h.graph.token.generateTokenPair(id, 'd1');
      await h.graph.token.generateTokenPair(id, 'd2');

      // Three separate impossible-score submissions → three CRITICAL flags.
      for (let i = 1; i <= 3; i++) {
        await h.graph.antiCheat.analyzeGameResult(id, `sess-${i}`, 999999, 60000, SAMPLE_GAME, {});
      }

      const user = await h.graph.prisma.user.findUnique({ where: { id } });
      expect(user!.is_banned).toBe(true);
      expect(user!.ban_reason).toContain('anti-cheat');

      // Access can no longer be renewed — all refresh tokens were deleted.
      const tokens = await h.graph.prisma.refreshToken.count({ where: { user_id: id } });
      expect(tokens).toBe(0);
    });
  });

  describe('direct enforcement (atomic, idempotent)', () => {
    it('atomically bans, disqualifies the session and removes the leaderboard score', async () => {
      const { id } = await createUser(h.graph.prisma);
      await h.graph.token.generateTokenPair(id);
      const session = await h.graph.prisma.gameSession.create({
        data: { user_id: id, game_type: SAMPLE_GAME, mode: 'FREE_PLAY', server_seed: 'seed', config: {} },
      });
      // Seed a leaderboard score to prove enforcement removes it.
      await h.graph.leaderboard.updateScore(id, SAMPLE_GAME, 1500);
      expect(await h.redisAdmin.zscore(`lb:game:${SAMPLE_GAME}:all-time`, id)).toBe('1500');

      const result = await h.graph.enforcement.enforce({
        userId: id,
        sessionId: session.id,
        reason: 'Confirmed cheating',
        actions: [
          EnforcementAction.INVALIDATE_SESSION,
          EnforcementAction.REMOVE_LEADERBOARD_SCORE,
          EnforcementAction.INVALIDATE_REWARDS,
        ],
        confirmed: true,
        enforcedBy: 'admin-1',
      });
      expect(result.enforced).toBe(true);

      const user = await h.graph.prisma.user.findUnique({ where: { id } });
      expect(user!.is_banned).toBe(true);

      const disqualified = await h.graph.prisma.gameSession.findUnique({ where: { id: session.id } });
      expect(disqualified!.outcome).toBe('DISQUALIFIED');
      expect(disqualified!.score).toBe(0);

      // Leaderboard score removed (post-commit external effect).
      expect(await h.redisAdmin.zscore(`lb:game:${SAMPLE_GAME}:all-time`, id)).toBeNull();

      // Refresh tokens purged.
      expect(await h.graph.prisma.refreshToken.count({ where: { user_id: id } })).toBe(0);
    });

    it('is idempotent — a duplicate enforcement is a no-op', async () => {
      const { id } = await createUser(h.graph.prisma);
      const session = await h.graph.prisma.gameSession.create({
        data: { user_id: id, game_type: SAMPLE_GAME, mode: 'FREE_PLAY', server_seed: 'seed', config: {} },
      });
      const req = {
        userId: id,
        sessionId: session.id,
        reason: 'Confirmed cheating',
        actions: [EnforcementAction.INVALIDATE_SESSION, EnforcementAction.INVALIDATE_REWARDS],
        confirmed: true,
      };

      const first = await h.graph.enforcement.enforce(req);
      const second = await h.graph.enforcement.enforce(req);

      expect(first.enforced).toBe(true);
      expect(second.enforced).toBe(false);
      expect(second.alreadyEnforced).toBe(true);
    });
  });

  describe('reversal (un-ban)', () => {
    it('reverses a ban and transitions the user back to not-banned', async () => {
      const { id } = await createUser(h.graph.prisma);
      await h.graph.enforcement.enforce({
        userId: id,
        reason: 'ban',
        actions: [EnforcementAction.INVALIDATE_REWARDS],
        confirmed: true,
      });
      expect((await h.graph.prisma.user.findUnique({ where: { id } }))!.is_banned).toBe(true);

      const rev = await h.graph.enforcement.reverse({ userId: id, reason: 'appeal upheld', reversedBy: 'admin-1' });
      expect(rev.reversed).toBe(true);
      expect(rev.transitioned).toBe(true);

      const user = await h.graph.prisma.user.findUnique({ where: { id } });
      expect(user!.is_banned).toBe(false);
      expect(user!.ban_reason).toBeNull();
    });
  });
});
