import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventBusService } from '../events/event-bus.service';
import { PlatformEventType } from '../events/event.types';
import {
  WS_RECONNECTION_GRACE_TTL_SECONDS,
  REDIS_KEY_GRACE_PREFIX,
  REDIS_KEY_GRACE_EXPIRATIONS,
  REDIS_CHANNEL_TOURNAMENT_EVENTS,
  MatchGraceSnapshot,
  ForfeitedMatchResult,
  ResumeSessionResult,
  SessionConnectionStatus,
} from './ws.constants';

@Injectable()
export class ReconnectionGraceService {
  private readonly logger = new Logger(ReconnectionGraceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
  ) {}

  /**
   * Snapshot active match state upon client disconnection.
   * Grants a strict 30-second grace window for mobile Wi-Fi/4G handovers.
   */
  async saveGraceSnapshot(
    snapshot: Omit<MatchGraceSnapshot, 'expiresAt' | 'status'> & {
      status?: SessionConnectionStatus;
    },
  ): Promise<MatchGraceSnapshot> {
    const disconnectedAt = snapshot.disconnectedAt || Date.now();
    const expiresAt = disconnectedAt + WS_RECONNECTION_GRACE_TTL_SECONDS * 1000;

    const fullSnapshot: MatchGraceSnapshot = {
      ...snapshot,
      disconnectedAt,
      expiresAt,
      status: 'DISCONNECTED_TRANSIENT',
    };

    const redisKey = `${REDIS_KEY_GRACE_PREFIX}${snapshot.matchId}:${snapshot.userId}`;
    const payload = JSON.stringify(fullSnapshot);

    // Save with 30-second TTL
    await this.redis.set(redisKey, payload, WS_RECONNECTION_GRACE_TTL_SECONDS);

    // Register in expiration sorted set
    const member = `${snapshot.matchId}:${snapshot.userId}`;
    await this.redis.zadd(REDIS_KEY_GRACE_EXPIRATIONS, expiresAt, member);

    this.logger.log(
      `Saved disconnection snapshot for user ${snapshot.userId} in match ${snapshot.matchId}. ` +
        `Grace period expires in ${WS_RECONNECTION_GRACE_TTL_SECONDS}s at ${new Date(expiresAt).toISOString()}`,
    );

    return fullSnapshot;
  }

  /**
   * Retrieve active grace snapshot if it exists and has not expired.
   */
  async getGraceSnapshot(matchId: string, userId: string): Promise<MatchGraceSnapshot | null> {
    const redisKey = `${REDIS_KEY_GRACE_PREFIX}${matchId}:${userId}`;
    const data = await this.redis.get(redisKey);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as MatchGraceSnapshot;
      if (Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Resume session when player reconnects within the 30-second grace period.
   * Validates match ticket and restores level, accumulated score, and sequence counter intact.
   */
  async resumeSession(
    matchId: string,
    userId: string,
    matchTicket?: string,
  ): Promise<ResumeSessionResult> {
    const redisKey = `${REDIS_KEY_GRACE_PREFIX}${matchId}:${userId}`;
    const data = await this.redis.get(redisKey);

    if (!data) {
      return {
        resumed: false,
        snapshot: null,
        reason: 'SESSION_EXPIRED_OR_NOT_FOUND',
      };
    }

    let snapshot: MatchGraceSnapshot;
    try {
      snapshot = JSON.parse(data);
    } catch {
      return {
        resumed: false,
        snapshot: null,
        reason: 'MALFORMED_SESSION_DATA',
      };
    }

    if (Date.now() > snapshot.expiresAt) {
      // Clean up expired key and trigger forfeit
      await this.redis.del(redisKey);
      await this.redis.zrem(REDIS_KEY_GRACE_EXPIRATIONS, `${matchId}:${userId}`);
      await this.forfeitSession(matchId, userId, snapshot);
      return {
        resumed: false,
        snapshot: null,
        reason: 'GRACE_PERIOD_EXPIRED',
      };
    }

    // Optional ticket validation
    if (matchTicket && snapshot.metadata?.matchTicket) {
      if (matchTicket !== snapshot.metadata.matchTicket) {
        return {
          resumed: false,
          snapshot: null,
          reason: 'INVALID_MATCH_TICKET',
        };
      }
    }

    // Clean up grace reservation
    await this.redis.del(redisKey);
    await this.redis.zrem(REDIS_KEY_GRACE_EXPIRATIONS, `${matchId}:${userId}`);

    snapshot.status = 'RESUMED';

    this.logger.log(
      `Resumed session for user ${userId} in match ${matchId}. Score preserved: ${snapshot.currentScore}, Level: ${snapshot.level}`,
    );

    return {
      resumed: true,
      snapshot,
    };
  }

  /**
   * Forfeit session upon 30s grace expiry, finalize current score, and lock match.
   */
  async forfeitSession(
    matchId: string,
    userId: string,
    providedSnapshot?: MatchGraceSnapshot,
  ): Promise<ForfeitedMatchResult> {
    const redisKey = `${REDIS_KEY_GRACE_PREFIX}${matchId}:${userId}`;
    let snapshot = providedSnapshot;

    if (!snapshot) {
      const data = await this.redis.get(redisKey);
      if (data) {
        try {
          snapshot = JSON.parse(data);
        } catch {
          // ignore
        }
      }
    }

    const finalScore = snapshot?.currentScore ?? 0;
    const tournamentId = snapshot?.tournamentId ?? 'unknown';
    const stageNumber = snapshot?.stageNumber ?? 1;

    // Remove from Redis grace stores
    await this.redis.del(redisKey);
    await this.redis.zrem(REDIS_KEY_GRACE_EXPIRATIONS, `${matchId}:${userId}`);

    const result: ForfeitedMatchResult = {
      matchId,
      userId,
      tournamentId,
      stageNumber,
      finalScore,
      status: 'FORFEITED',
      forfeitedAt: new Date().toISOString(),
    };

    // Update DB game session if matchId corresponds to a gameSession record
    try {
      await this.prisma.gameSession.updateMany({
        where: { id: matchId, user_id: userId, outcome: null },
        data: {
          outcome: 'ABANDONED',
          final_score: finalScore,
          completed_at: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(`Could not update DB gameSession for forfeited match ${matchId}: ${(err as Error).message}`);
    }

    // Publish event across multi-node cluster
    try {
      await this.redis.publish(
        REDIS_CHANNEL_TOURNAMENT_EVENTS,
        JSON.stringify({
          event: 'MATCH_FORFEITED',
          payload: result,
        }),
      );
    } catch (err) {
      this.logger.warn(`Failed to publish forfeit event to Redis channel: ${(err as Error).message}`);
    }

    this.logger.warn(
      `Match ${matchId} for user ${userId} permanently FORFEITED after 30s grace expiry. Final score: ${finalScore}`,
    );

    return result;
  }

  /**
   * Background task to reap expired grace sessions.
   * Runs every 5 seconds to guarantee prompt forfeit handling without key polling.
   */
  @Cron('*/5 * * * * *')
  async reapExpiredGraceSessions(): Promise<number> {
    const lockAcquired = await this.redis.acquireLock('lock:cron:reapGraceSessions', 4);
    if (!lockAcquired) return 0;

    const now = Date.now();
    // Query entries where score <= now
    const expiredMembers = await this.redis.zrangebyscore(
      REDIS_KEY_GRACE_EXPIRATIONS,
      0,
      now,
      50,
    );

    if (!expiredMembers || expiredMembers.length === 0) {
      return 0;
    }

    let forfeitedCount = 0;
    for (const member of expiredMembers) {
      const [matchId, userId] = member.split(':');
      if (matchId && userId) {
        try {
          await this.forfeitSession(matchId, userId);
          forfeitedCount++;
        } catch (err) {
          this.logger.error(`Error forfeiting expired grace member ${member}:`, err);
        }
      }
    }

    if (forfeitedCount > 0) {
      this.logger.log(`Reaped ${forfeitedCount} expired grace sessions.`);
    }

    return forfeitedCount;
  }
}
