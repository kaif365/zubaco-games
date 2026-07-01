/**
 * SECTION F — TOURNAMENT (DATABASE-BACKED integration, Phase T4-A)
 *
 * Real TournamentService registration and the authoritative RewardPayoutService
 * prize distribution against a REAL PostgreSQL + Redis. Covers season-entry
 * persistence, duplicate/capacity guards, the paid-tournament age gate, and
 * idempotent prize crediting through the single wallet ledger pipeline.
 */
import { ConflictException } from '@nestjs/common';
import { Harness, startHarness } from './harness';
import { createUser, createUserWithWallet, getBalances } from './prisma-test-util';

describe('Tournament — DB integration', () => {
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

  const freeSeason = () =>
    h.graph.prisma.season.create({
      data: { name: 'Free Cup', start_date: new Date(), end_date: new Date(Date.now() + 30 * 86400000), status: 'REGISTRATION' },
    });

  describe('registration', () => {
    it('registers a user for a free season and persists a SeasonEntry', async () => {
      const { id } = await createUser(h.graph.prisma);
      const season = await freeSeason();

      const res = await h.graph.tournament.registerForSeason(id, season.id);
      expect(res.entry_id).toBeTruthy();

      const entry = await h.graph.prisma.seasonEntry.findUnique({
        where: { user_id_season_id: { user_id: id, season_id: season.id } },
      });
      expect(entry).toBeTruthy();
      expect(entry!.status).toBe('ACTIVE');
    });

    it('rejects a duplicate registration', async () => {
      const { id } = await createUser(h.graph.prisma);
      const season = await freeSeason();
      await h.graph.tournament.registerForSeason(id, season.id);

      await expect(h.graph.tournament.registerForSeason(id, season.id)).rejects.toBeInstanceOf(ConflictException);
      expect(await h.graph.prisma.seasonEntry.count({ where: { season_id: season.id } })).toBe(1);
    });

    it('rejects registration when the season is full', async () => {
      const a = await createUser(h.graph.prisma);
      const b = await createUser(h.graph.prisma);
      const season = await h.graph.prisma.season.create({
        data: {
          name: 'Tiny',
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 86400000),
          status: 'REGISTRATION',
          max_players: 1,
        },
      });
      await h.graph.tournament.registerForSeason(a.id, season.id);

      await expect(h.graph.tournament.registerForSeason(b.id, season.id)).rejects.toThrow(/full/i);
    });

    it('gates paid tournaments behind age verification', async () => {
      const { id } = await createUser(h.graph.prisma); // age_verified = false
      const season = await h.graph.prisma.season.create({
        data: {
          name: 'Paid Cup',
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 86400000),
          status: 'ACTIVE',
          entry_fee: 100,
        },
      });

      await expect(h.graph.tournament.registerForSeason(id, season.id)).rejects.toBeDefined();
      // No entry was created because the gate rejected before persistence.
      expect(await h.graph.prisma.seasonEntry.count({ where: { season_id: season.id } })).toBe(0);
    });
  });

  describe('reward payout', () => {
    it('credits the prize pool to a winner via the wallet ledger (idempotent)', async () => {
      const winner = await createUserWithWallet(h.graph.prisma, { balance: 0 });
      const season = await h.graph.prisma.season.create({
        data: {
          name: 'Completed Cup',
          start_date: new Date(Date.now() - 40 * 86400000),
          end_date: new Date(Date.now() - 86400000),
          status: 'COMPLETED',
          prize_pool: 1000,
        },
      });
      const entry = await h.graph.prisma.seasonEntry.create({
        data: { user_id: winner.id, season_id: season.id, status: 'WINNER' },
      });
      const winners = [
        { seasonEntryId: entry.id, userId: winner.id, rank: 1, totalScore: 500, totalTimeMs: 60000 },
      ];

      const first = await h.graph.rewardPayout.distributeRewards(season.id, winners);
      expect(first.credited).toBe(1);
      expect(first.totalCredited).toBe(1000);

      const bal = await getBalances(h.graph.prisma, winner.id);
      expect(Number(bal.balance)).toBe(1000);
      const prizeTxns = await h.graph.prisma.transaction.count({
        where: { user_id: winner.id, type: 'PRIZE_WIN', status: 'COMPLETED' },
      });
      expect(prizeTxns).toBe(1);

      // Re-running must never double-pay (idempotent ledger key per season/user).
      await h.redisAdmin.del(`tourn:reward:payout:${season.id}`); // release run-lock to reach ledger guard
      const second = await h.graph.rewardPayout.distributeRewards(season.id, winners);
      expect(second.credited).toBe(0);
      expect(Number((await getBalances(h.graph.prisma, winner.id)).balance)).toBe(1000);
    });
  });
});
