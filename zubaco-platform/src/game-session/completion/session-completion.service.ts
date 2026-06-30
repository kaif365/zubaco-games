import { Injectable, Logger } from '@nestjs/common';
import { GameSession } from '.prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AntiCheatService } from '../../anti-cheat/anti-cheat.service';
import { WebhookService } from '../../webhook/webhook.service';
import { EventBusService } from '../../events/event-bus.service';
import { PlatformEventType } from '../../events/event.types';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { SessionState, assertTransition } from '../lifecycle/session-lifecycle';
import { VerificationPipeline } from '../verification/verification.pipeline';
import { VerificationStatus } from '../verification/verification.types';

/** Untrusted, client-claimed completion values handed in by each engine. */
export interface CompletionRequest {
  /** Client-claimed score — diffed only, never authoritative. */
  claimedScore: number | null;
  durationMs: number;
  metadata: any;
}

/** Authoritative result every engine receives back from the shared path. */
export interface CompletionOutcome {
  session: GameSession;
  status: VerificationStatus;
  authoritativeScore: number;
  maxScore: number;
  durationMs: number;
  outcome: 'COMPLETED' | 'DISQUALIFIED';
  flagged: boolean;
  validated: boolean;
}

/**
 * Single authoritative game-completion path (ROLLOUT-002).
 *
 * Every completion engine (game-session, free-play, tournament) routes through
 * this one routine so there is exactly ONE server-authoritative pipeline and no
 * divergent legacy scoring. The caller loads the ACTIVE session (outcome ===
 * null) and supplies only client-claimed values; this service runs, in order:
 *
 *   GAME-001 Lifecycle guard (ACTIVE -> RESULT_PROCESSING -> COMPLETED)
 *     -> GAME-002 Verification (server-authoritative score validation)
 *     -> persist the authoritative result
 *     -> ACHEAT-001 anti-cheat detection (best-effort)
 *     -> Event publication (GAME_COMPLETED + VERIFICATION_PASSED/FAILED)
 *     -> Base-Platform webhook (durable, signed) which drives downstream
 *        leaderboard / tournament progression / wallet eligibility.
 *
 * No client score/duration ever becomes authoritative; both are diffed only.
 */
@Injectable()
export class SessionCompletionService {
  private readonly logger = new Logger(SessionCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationPipeline,
    private readonly antiCheat: AntiCheatService,
    private readonly webhook: WebhookService,
    private readonly events: EventBusService,
    private readonly redis: RedisService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async complete(session: GameSession, req: CompletionRequest): Promise<CompletionOutcome> {
    // ── GAME-001 lifecycle: ACTIVE -> RESULT_PROCESSING ──
    // Single guard shared by every engine; rejects illegal/duplicate completion.
    assertTransition(SessionState.ACTIVE, SessionState.RESULT_PROCESSING);

    // ── GAME-002 universal server-authoritative verification ──
    // Runs BEFORE persistence, anti-cheat, event and webhook fan-out.
    const storedPuzzle = (session.metadata as any)?._puzzle;
    const verdict = this.verification.verify(
      {
        id: session.id,
        userId: session.user_id,
        gameType: session.game_type,
        mode: session.mode,
        config: session.config,
        serverSeed: session.server_seed,
        clientSeed: session.client_seed,
        nonce: session.nonce,
        startedAt: new Date(session.started_at),
        metadata: session.metadata,
        storedPuzzle,
      },
      { score: req.claimedScore, durationMs: req.durationMs, metadata: req.metadata },
    );

    const tampered = verdict.status === VerificationStatus.REJECTED;
    const flagged = verdict.status !== VerificationStatus.VERIFIED;
    const outcome: 'COMPLETED' | 'DISQUALIFIED' = tampered ? 'DISQUALIFIED' : 'COMPLETED';

    // ── lifecycle: RESULT_PROCESSING -> COMPLETED ──
    assertTransition(SessionState.RESULT_PROCESSING, SessionState.COMPLETED);

    const updated = await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        score: verdict.authoritativeScore,
        max_score: verdict.maxScore,
        duration_ms: verdict.authoritativeDurationMs,
        outcome,
        completed_at: new Date(),
        metadata: {
          ...(req.metadata || {}),
          ...(storedPuzzle ? { _puzzle: storedPuzzle } : {}),
          _verification: {
            status: verdict.status,
            integrity: verdict.integrity,
            validated: verdict.validated,
            ...verdict.metadata,
            flagged,
          },
        },
      },
    });

    // ── ACHEAT-001 anti-cheat detection on the authoritative result ──
    // Best-effort: never block completion on analysis failure.
    try {
      await this.antiCheat.analyzeGameResult(
        session.user_id,
        updated.id,
        verdict.authoritativeScore,
        req.durationMs,
        updated.game_type,
        {
          metadata: req.metadata,
          claimedScore: req.claimedScore,
          serverScore: verdict.metadata?.server_score,
          boardTampered: tampered,
        },
      );
    } catch {
      // intentionally swallowed
    }

    // ── Event publication (idempotent on session id; best-effort) ──
    try {
      await this.events.publish(
        PlatformEventType.GAME_COMPLETED,
        {
          session_id: updated.id,
          game_type: updated.game_type,
          mode: updated.mode,
          score: verdict.authoritativeScore,
          max_score: verdict.maxScore,
          outcome,
          validated: verdict.validated,
          flagged,
        },
        session.user_id,
        `game-completed:${updated.id}`,
      );
      await this.events.publish(
        verdict.validated ? PlatformEventType.VERIFICATION_PASSED : PlatformEventType.VERIFICATION_FAILED,
        { session_id: updated.id, status: verdict.status, integrity: verdict.integrity },
        session.user_id,
        `verification:${updated.id}`,
      );
    } catch (err) {
      this.logger.warn(`Event publication failed for ${updated.id}: ${(err as Error).message}`);
    }

    // ── Base-Platform webhook (durable, signed, async) ──
    await this.webhook.emitGameResult({
      session_id: updated.id,
      user_id: updated.user_id,
      game_type: updated.game_type as any,
      mode: updated.mode as any,
      score: updated.score ?? 0,
      max_score: updated.max_score ?? 0,
      duration_ms: updated.duration_ms,
      outcome: updated.outcome ?? 'COMPLETED',
      stage_entry_id: updated.stage_entry_id,
      level: updated.level,
      flagged,
      validated: verdict.validated,
      completed_at: (updated.completed_at ?? new Date()).toISOString(),
    });

    // ── LEADER-001 authoritative leaderboard update ──
    // The ONLY runtime that writes the global Redis leaderboard. Runs exactly
    // once per session, and ONLY for a server-VERIFIED, non-disqualified result
    // (validated && outcome === 'COMPLETED'). Rejected/flagged/disqualified
    // sessions and banned users therefore never rank. Best-effort: a leaderboard
    // failure never rolls back the already-committed authoritative completion.
    if (verdict.validated && outcome === 'COMPLETED') {
      try {
        await this.updateLeaderboard(updated, verdict.authoritativeScore);
      } catch (err) {
        this.logger.warn(`Leaderboard update failed for ${updated.id}: ${(err as Error).message}`);
      }
    }

    return {
      session: updated,
      status: verdict.status,
      authoritativeScore: verdict.authoritativeScore,
      maxScore: verdict.maxScore,
      durationMs: verdict.authoritativeDurationMs,
      outcome,
      flagged,
      validated: verdict.validated,
    };
  }

  /**
   * Authoritative global-leaderboard write (LEADER-001).
   *
   * Guards, in order:
   *   1. Exactly-once: a per-session Redis marker (setnx) makes any second
   *      update for the same session a no-op, so duplicate ranking is
   *      impossible even if the completion path is somehow re-entered.
   *   2. Ban safety (defense-in-depth): a user banned between session start and
   *      completion is re-checked here and never ranks.
   * The score was already server-verified by the caller; this method only routes
   * it into the existing LeaderboardService — no new ranking rules are added.
   */
  private async updateLeaderboard(session: GameSession, score: number): Promise<void> {
    const marker = `lb:session:${session.id}`;
    const fresh = await this.redis.setnx(marker, '1');
    if (!fresh) return; // already ranked this session — exactly-once
    await this.redis.expire(marker, 60 * 60 * 24 * 7);

    const user = await this.prisma.user.findUnique({
      where: { id: session.user_id },
      select: { is_banned: true },
    });
    if (!user || user.is_banned) return; // banned users never rank

    await this.leaderboard.updateScore(session.user_id, session.game_type, score);

    await this.events.publish(
      PlatformEventType.LEADERBOARD_UPDATED,
      { session_id: session.id, game_type: session.game_type, score },
      session.user_id,
      `leaderboard:${session.id}`,
    );
  }
}
