/**
 * SECTIONS B & C — SESSION LIFECYCLE + GAME VERIFICATION (Phase T4-A)
 *
 * Drives the SINGLE authoritative completion path (GameSessionService.submitResult
 * → SessionCompletionService → VerificationPipeline → persist → anti-cheat →
 * events/webhook) against a REAL PostgreSQL + Redis. Verifies session creation,
 * server-authoritative scoring/verification persistence, lifecycle transitions,
 * and replay / duplicate-completion / invalid-input rejection.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Harness, startHarness } from './harness';
import { createUser } from './prisma-test-util';

// FLASH_SPOT is not a server-generated puzzle, keeping the fixture minimal.
const GAME = 'FLASH_SPOT' as const;

describe('Session Lifecycle & Verification — DB integration', () => {
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

  describe('session creation', () => {
    it('creates an ACTIVE (uncompleted) session persisted in Postgres', async () => {
      const { id } = await createUser(h.graph.prisma);

      const started = await h.graph.gameSession.startGame(id, GAME, {});
      expect(started.gameSessionId).toBeTruthy();

      const row = await h.graph.prisma.gameSession.findUnique({ where: { id: started.gameSessionId } });
      expect(row).toBeTruthy();
      expect(row!.outcome).toBeNull(); // ACTIVE
      expect(row!.completed_at).toBeNull();
      expect(row!.mode).toBe('FREE_PLAY');
    });
  });

  describe('completion + verification persistence', () => {
    it('completes the session with a server-authoritative, verified result', async () => {
      const { id } = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(id, GAME, {});

      const result = await h.graph.gameSession.submitResult(started.gameSessionId, id, 100, 2000, {
        rounds: [],
      });
      expect(result.success).toBe(true);
      expect(typeof result.score).toBe('number'); // server-derived, not client-trusted

      const row = await h.graph.prisma.gameSession.findUnique({ where: { id: started.gameSessionId } });
      expect(row!.outcome).toBe('COMPLETED');
      expect(row!.completed_at).not.toBeNull();
      // The verification verdict is persisted onto the session metadata.
      const verification = (row!.metadata as any)?._verification;
      expect(verification).toBeTruthy();
      expect(verification.status).toBeTruthy();
      expect(row!.score).toBe(result.score); // persisted score == authoritative score
    });
  });

  describe('lifecycle guards: replay / duplicate / invalid input', () => {
    it('rejects a duplicate completion of an already-completed session (replay)', async () => {
      const { id } = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(id, GAME, {});
      await h.graph.gameSession.submitResult(started.gameSessionId, id, 100, 2000, { rounds: [] });

      // Second submit: the session is no longer ACTIVE → not found (no re-scoring).
      await expect(
        h.graph.gameSession.submitResult(started.gameSessionId, id, 100, 2000, { rounds: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a negative score outright', async () => {
      const { id } = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(id, GAME, {});
      await expect(
        h.graph.gameSession.submitResult(started.gameSessionId, id, -5, 2000, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an implausibly short duration', async () => {
      const { id } = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(id, GAME, {});
      await expect(
        h.graph.gameSession.submitResult(started.gameSessionId, id, 100, 500, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a duration beyond the maximum session window (timeout)', async () => {
      const { id } = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(id, GAME, {});
      await expect(
        h.graph.gameSession.submitResult(started.gameSessionId, id, 100, 1_900_000, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects completion of another user\'s session', async () => {
      const owner = await createUser(h.graph.prisma);
      const other = await createUser(h.graph.prisma);
      const started = await h.graph.gameSession.startGame(owner.id, GAME, {});
      await expect(
        h.graph.gameSession.submitResult(started.gameSessionId, other.id, 100, 2000, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
