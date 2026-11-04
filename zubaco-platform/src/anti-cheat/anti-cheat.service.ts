import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameType, CheatFlagType, CheatSeverity } from '.prisma/client';
import { EnforcementService } from './enforcement/enforcement.service';
import { EnforcementAction } from './enforcement/enforcement.types';

import { CadenceAnalyzerService } from './heuristics/cadence-analyzer.service';

@Injectable()
export class AntiCheatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enforcement: EnforcementService,
    private readonly cadenceAnalyzer: CadenceAnalyzerService = new CadenceAnalyzerService(),
  ) {}

  // ─── SCORE ANOMALY DETECTION ───────────────────────────────────

  /**
   * Analyse a completed game result for cheating signals and persist any flags.
   *
   * `context` carries server-side facts derived during scoring:
   *  - metadata: the raw submission (may contain an input/move log)
   *  - serverScore / claimedScore: authoritative vs client-claimed score
   *  - boardTampered: set when a server-generated puzzle fingerprint mismatched
   */
  async analyzeGameResult(
    userId: string,
    sessionId: string,
    score: number,
    durationMs: number,
    gameType: GameType,
    context: {
      metadata?: any;
      claimedScore?: number | null;
      serverScore?: number;
      boardTampered?: boolean;
    } = {},
  ) {
    const flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[] = [];

    // 1. Check for impossible scores (above theoretical maximum)
    const maxPossible = this.getMaxPossibleScore(gameType);
    if (score > maxPossible) {
      flags.push({
        type: 'IMPOSSIBLE_SCORE',
        severity: 'CRITICAL',
        details: { score, max_possible: maxPossible, game_type: gameType },
      });
    }

    // 2. Check for timing anomalies (completed too fast)
    const minReasonableTime = this.getMinReasonableTime(gameType);
    if (durationMs < minReasonableTime && score > 0) {
      flags.push({
        type: 'TIMING_ANOMALY',
        severity: 'HIGH',
        details: { duration_ms: durationMs, min_reasonable_ms: minReasonableTime },
      });
    }

    // 2b. Server vs client score mismatch → session tampering.
    if (context.boardTampered) {
      flags.push({
        type: 'SESSION_TAMPERING',
        severity: 'CRITICAL',
        details: { reason: 'board_fingerprint_mismatch', game_type: gameType },
      });
    }
    if (
      typeof context.claimedScore === 'number' &&
      typeof context.serverScore === 'number' &&
      context.claimedScore > context.serverScore + Math.max(10, context.serverScore * 0.25)
    ) {
      flags.push({
        type: 'SESSION_TAMPERING',
        severity: 'HIGH',
        details: {
          reason: 'client_score_inflation',
          claimed: context.claimedScore,
          server: context.serverScore,
        },
      });
    }

    // 2c. Bot / superhuman input cadence from the move log.
    const inputFlag = this.analyzeInputTimings(context.metadata, gameType);
    if (inputFlag) flags.push(inputFlag);

    // 3. Check for rapid progression (statistical outlier)
    const recentScores = await this.prisma.gameSession.findMany({
      where: { user_id: userId, game_type: gameType, outcome: 'COMPLETED' },
      orderBy: { completed_at: 'desc' },
      take: 10,
      select: { score: true },
    });

    if (recentScores.length >= 5) {
      const scores = recentScores.map((s) => s.score || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length);

      // Score is more than 3 standard deviations above mean
      if (stdDev > 0 && score > avg + 3 * stdDev) {
        flags.push({
          type: 'SCORE_ANOMALY',
          severity: 'MEDIUM',
          details: { score, average: avg, std_dev: stdDev, threshold: avg + 3 * stdDev },
        });
      }
    }

    // 4. Check for rapid level progression
    const lastHourSessions = await this.prisma.gameSession.count({
      where: {
        user_id: userId,
        started_at: { gte: new Date(Date.now() - 3600000) },
        outcome: 'COMPLETED',
      },
    });

    if (lastHourSessions > 20) {
      flags.push({
        type: 'RAPID_PROGRESSION',
        severity: 'LOW',
        details: { sessions_last_hour: lastHourSessions },
      });
    }

    // Store flags
    if (flags.length > 0) {
      await this.prisma.cheatFlag.createMany({
        data: flags.map((f) => ({
          user_id: userId,
          session_id: sessionId,
          game_type: gameType,
          flag_type: f.type,
          severity: f.severity,
          details: f.details,
        })),
      });
    }

    // Auto-ban for critical flags
    const criticalCount = await this.prisma.cheatFlag.count({
      where: { user_id: userId, severity: 'CRITICAL' },
    });

    if (criticalCount >= 3) {
      // Single enforcement plane: the ban is written by EnforcementService, never
      // here. enforce() sets is_banned + ban_reason and purges refresh tokens
      // atomically and idempotently. The session sweep below remains for the
      // "disqualify ALL of the user's open sessions" cleanup that enforce does
      // not cover (it scopes session disqualification to the supplied sessionId).
      await this.enforcement.enforce({
        userId,
        sessionId,
        reason: 'Automated: Multiple critical anti-cheat violations',
        actions: [EnforcementAction.INVALIDATE_REWARDS],
        confirmed: true,
        enforcedBy: 'system:auto-anti-cheat',
      });
      await this.invalidateUserSessions(userId);
    }

    return { flags_raised: flags.length, details: flags };
  }

  /**
   * Inspect the per-input move log for non-human cadence.
   * Delegates to CadenceAnalyzerService for neuromuscular floor (<50ms),
   * robotic zero-variance (stdDev < 5ms), and synthetic coordinate clamping checks.
   */
  private analyzeInputTimings(
    metadata: any,
    gameType: GameType,
  ): { type: CheatFlagType; severity: CheatSeverity; details: any } | null {
    const analysis = this.cadenceAnalyzer.analyze(metadata, gameType);
    if (!analysis.isCheat || !analysis.flagType || !analysis.severity) {
      return null;
    }
    return {
      type: analysis.flagType,
      severity: analysis.severity,
      details: {
        reason: analysis.reason,
        metrics: analysis.metrics,
        game_type: gameType,
      },
    };
  }

  /**
   * Hard-revoke a user's access: disqualify any in-flight game sessions and
   * delete all refresh tokens so existing access tokens cannot be renewed.
   */
  async invalidateUserSessions(userId: string) {
    await this.prisma.gameSession.updateMany({
      where: { user_id: userId, outcome: null },
      data: { outcome: 'DISQUALIFIED', completed_at: new Date() },
    });
    await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }

  // ─── ADMIN: GET FLAG QUEUE ─────────────────────────────────────

  async getFlagQueue(options: { page?: number; limit?: number; severity?: CheatSeverity; reviewed?: boolean }) {
    const { page = 1, limit = 20, severity, reviewed } = options;

    const where: any = {};
    if (severity) where.severity = severity;
    if (reviewed !== undefined) where.reviewed = reviewed;

    const [flags, total] = await Promise.all([
      this.prisma.cheatFlag.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cheatFlag.count({ where }),
    ]);

    return { flags, total, page, total_pages: Math.ceil(total / limit) };
  }

  // ─── ADMIN: REVIEW FLAG ───────────────────────────────────────

  async reviewFlag(flagId: string, actor: string, action: 'dismiss' | 'warn' | 'ban') {
    const flag = await this.prisma.cheatFlag.update({
      where: { id: flagId },
      data: {
        reviewed: true,
        reviewed_by: actor,
        reviewed_at: new Date(),
        action_taken: action,
      },
    });

    if (action === 'ban') {
      // Authoritative ban via the single enforcement plane.
      await this.enforcement.enforce({
        userId: flag.user_id,
        reason: `Admin ban: Anti-cheat flag ${flagId}`,
        actions: [EnforcementAction.INVALIDATE_REWARDS],
        confirmed: true,
        enforcedBy: actor,
      });
      await this.invalidateUserSessions(flag.user_id);
    }

    return flag;
  }

  // ─── ADMIN: BAN/UNBAN ─────────────────────────────────────────

  /**
   * Compatibility adapter. The ban itself is written by EnforcementService
   * (single enforcement plane); this method only adds the all-sessions sweep and
   * returns the resulting user for the existing API contract.
   */
  async banUser(userId: string, reason: string, enforcedBy = 'service:anti-cheat') {
    await this.enforcement.enforce({
      userId,
      reason,
      actions: [EnforcementAction.INVALIDATE_REWARDS],
      confirmed: true,
      enforcedBy,
    });
    await this.invalidateUserSessions(userId);
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  // NOTE: un-ban is now authoritative. The ban reversal is written by
  // EnforcementService.reverse() (the single enforcement plane) inside one
  // transaction, idempotently, with a post-commit ACCOUNT_RESTORED audit event.
  // This adapter only returns the resulting user for the existing API contract
  // and performs NO direct is_banned mutation.
  async unbanUser(userId: string, reversedBy = 'service:anti-cheat') {
    await this.enforcement.reverse({
      userId,
      reason: 'Admin unban',
      reversedBy,
    });
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  // ─── USER FLAG SUMMARY ────────────────────────────────────────

  async getUserFlags(userId: string) {
    const flags = await this.prisma.cheatFlag.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const summary = {
      total: flags.length,
      by_severity: {
        CRITICAL: flags.filter((f) => f.severity === 'CRITICAL').length,
        HIGH: flags.filter((f) => f.severity === 'HIGH').length,
        MEDIUM: flags.filter((f) => f.severity === 'MEDIUM').length,
        LOW: flags.filter((f) => f.severity === 'LOW').length,
      },
      unreviewed: flags.filter((f) => !f.reviewed).length,
    };

    return { flags, summary };
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private getMaxPossibleScore(gameType: GameType): number {
    const maxScores: Record<string, number> = {
      SEQUENCE_RECALL: 5000,
      MEMORY_CARD_MATCHING: 2000,
      FLASH_SPOT: 3000,
      OBJECT_PLACEMENT_MEMORY: 1500,
      SLIDING_PUZZLE: 2000,
      BLOCK_FILL: 2000,
      COLOUR_SORTING: 2000,
      RAPID_CATEGORY_SORT: 1000,
      MAZE_NAVIGATION: 2000,
      INFINITY_LOOP: 3000,
      WORD_UNSCRAMBLE: 1500,
      TRUE_FALSE_BLITZ: 1000,
      ARROWS: 2000,
      LOGIC_REFLECTOR: 2000,
      NUMBER_GRID_SPRINT: 1500,
      LIVE_ROUTE_BUILDER: 1500,
      MEMORY_GROUPS: 1000,
      REFLEX_ENDURANCE: 5000,
      PATTERN_SURVIVAL: 5000,
      SPEED_TYPE_ANSWER: 1500,
    };
    return maxScores[gameType] || 5000;
  }

  private getMinReasonableTime(gameType: GameType): number {
    // Minimum milliseconds for a human to reasonably play
    const minTimes: Record<string, number> = {
      SEQUENCE_RECALL: 5000,
      MEMORY_CARD_MATCHING: 8000,
      FLASH_SPOT: 5000,
      OBJECT_PLACEMENT_MEMORY: 5000,
      SLIDING_PUZZLE: 10000,
      BLOCK_FILL: 10000,
      COLOUR_SORTING: 8000,
      RAPID_CATEGORY_SORT: 10000,
      MAZE_NAVIGATION: 8000,
      INFINITY_LOOP: 10000,
      WORD_UNSCRAMBLE: 5000,
      TRUE_FALSE_BLITZ: 15000,
      ARROWS: 8000,
      LOGIC_REFLECTOR: 10000,
      NUMBER_GRID_SPRINT: 8000,
      LIVE_ROUTE_BUILDER: 8000,
      MEMORY_GROUPS: 5000,
      REFLEX_ENDURANCE: 20000,
      PATTERN_SURVIVAL: 10000,
      SPEED_TYPE_ANSWER: 8000,
    };
    return minTimes[gameType] || 5000;
  }

  /**
   * Sweeps and lifts expired temporary bans.
   */
  async reapExpiredTempBans(): Promise<number> {
    const tempBannedUsers = await this.prisma.user.findMany({
      where: {
        is_banned: true,
        ban_reason: { contains: 'TEMPORARY' },
      },
      select: { id: true, updated_at: true },
    });

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const expiredIds: string[] = [];

    for (const u of tempBannedUsers) {
      if (now - new Date(u.updated_at).getTime() >= twentyFourHours) {
        expiredIds.push(u.id);
      }
    }

    if (expiredIds.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: expiredIds } },
        data: { is_banned: false, ban_reason: null },
      });
    }

    return expiredIds.length;
  }
}
