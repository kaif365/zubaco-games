import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GameType, CheatFlagType, CheatSeverity } from '.prisma/client';

@Injectable()
export class AntiCheatService {
  constructor(private readonly prisma: PrismaService) {}

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
      await this.prisma.user.update({
        where: { id: userId },
        data: { is_banned: true, ban_reason: 'Automated: Multiple critical anti-cheat violations' },
      });
      // Revoke access: kill active sessions and refresh tokens immediately.
      await this.invalidateUserSessions(userId);
    }

    return { flags_raised: flags.length, details: flags };
  }

  /**
   * Inspect the per-input move log for non-human cadence.
   *
   * The client may submit `metadata.input_log` (or `move_log`) as an array of
   * monotonically increasing millisecond timestamps (or `{ t }` objects). We
   * flag two signals:
   *  - Repeated sub-100ms intervals (faster than human reaction/motor limits).
   *  - Near-zero variance across many inputs (macro / replay bot signature).
   */
  private analyzeInputTimings(
    metadata: any,
    gameType: GameType,
  ): { type: CheatFlagType; severity: CheatSeverity; details: any } | null {
    const raw = metadata?.input_log ?? metadata?.move_log;
    if (!Array.isArray(raw) || raw.length < 4) return null;

    const times = raw
      .map((m: any) => (typeof m === 'number' ? m : typeof m?.t === 'number' ? m.t : null))
      .filter((t: any): t is number => t !== null);
    if (times.length < 4) return null;

    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      const d = times[i] - times[i - 1];
      if (d >= 0) intervals.push(d);
    }
    if (intervals.length < 3) return null;

    const SUB_HUMAN_MS = 100;
    const subHuman = intervals.filter((d) => d < SUB_HUMAN_MS).length;

    // Coefficient of variation — machine-precise consistency is suspicious.
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / intervals.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

    if (subHuman >= 3) {
      return {
        type: 'INPUT_BOT_PATTERN',
        severity: subHuman >= 6 ? 'CRITICAL' : 'HIGH',
        details: {
          reason: 'sub_100ms_inputs',
          sub_human_inputs: subHuman,
          total_inputs: intervals.length,
          game_type: gameType,
        },
      };
    }

    if (intervals.length >= 10 && cv < 0.02) {
      return {
        type: 'INPUT_BOT_PATTERN',
        severity: 'HIGH',
        details: {
          reason: 'zero_variance_cadence',
          coefficient_of_variation: Number(cv.toFixed(4)),
          mean_interval_ms: Math.round(mean),
          total_inputs: intervals.length,
        },
      };
    }

    return null;
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

  async reviewFlag(flagId: string, adminId: string, action: 'dismiss' | 'warn' | 'ban') {
    const flag = await this.prisma.cheatFlag.update({
      where: { id: flagId },
      data: {
        reviewed: true,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        action_taken: action,
      },
    });

    if (action === 'ban') {
      await this.prisma.user.update({
        where: { id: flag.user_id },
        data: { is_banned: true, ban_reason: `Admin ban: Anti-cheat flag ${flagId}` },
      });
      await this.invalidateUserSessions(flag.user_id);
    }

    return flag;
  }

  // ─── ADMIN: BAN/UNBAN ─────────────────────────────────────────

  async banUser(userId: string, reason: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { is_banned: true, ban_reason: reason },
    });
    await this.invalidateUserSessions(userId);
    return user;
  }

  async unbanUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { is_banned: false, ban_reason: null },
    });
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
}
