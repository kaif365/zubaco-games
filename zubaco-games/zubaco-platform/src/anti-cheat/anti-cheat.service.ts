import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { DeviceDetectionService } from './device-detection.service';
import { GameType, CheatFlagType, CheatSeverity, Prisma } from '.prisma/client';
import { InputSignature, detectBotPattern, detectPatternShift } from '../game-session/utils/input-analyzer';
import { isValidMoveHash } from '../game-session/utils/move-hasher';

// ─── RISK SCORE POINTS ──────────────────────────────────────────────
const RISK_POINTS: Record<CheatSeverity, number> = {
  CRITICAL: 50,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
};

// ─── PENALTY TIERS ──────────────────────────────────────────────────
// Tier 0: Clean | 1: Warning | 2: Throttle | 3: Cooldown | 4: Temp Ban | 5: Perma Ban
const PENALTY_THRESHOLDS = [0, 25, 50, 75, 100, 150];

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);
  private settingsCache: Map<string, string> | null = null;
  private settingsCacheTime = 0;
  private readonly SETTINGS_TTL = 300000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly deviceDetection: DeviceDetectionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS — Read from DB, cached 5 min
  // ═══════════════════════════════════════════════════════════════

  private async getSetting(key: string, fallback: number): Promise<number> {
    // Refresh cache if expired
    if (!this.settingsCache || Date.now() - this.settingsCacheTime > this.SETTINGS_TTL) {
      try {
        const settings = await this.prisma.systemSetting.findMany();
        this.settingsCache = new Map(settings.map((s) => [s.key, s.value]));
        this.settingsCacheTime = Date.now();
      } catch {
        // If SystemSetting table doesn't exist yet, use fallback
        this.settingsCache = new Map();
        this.settingsCacheTime = Date.now();
      }
    }
    const val = this.settingsCache?.get(key);
    return val ? parseFloat(val) : fallback;
  }

  // ═══════════════════════════════════════════════════════════════
  // RISK SCORE — Redis-based, decays over time
  // ═══════════════════════════════════════════════════════════════

  async getRiskScore(userId: string): Promise<number> {
    const raw = await this.redis.get(`risk:${userId}`);
    return raw ? parseInt(raw, 10) : 0;
  }

  async addRiskPoints(userId: string, severity: CheatSeverity): Promise<number> {
    const points = RISK_POINTS[severity];
    const key = `risk:${userId}`;
    const current = await this.redis.get(key);
    const newScore = (current ? parseInt(current, 10) : 0) + points;
    await this.redis.set(key, String(newScore), 86400); // 24h TTL
    return newScore;
  }

  async resetRiskScore(userId: string): Promise<void> {
    await this.redis.del(`risk:${userId}`);
  }

  /**
   * Immediately reflect a ban/unban in the JwtAuthGuard ban cache (`ban_check:<id>`) so
   * access is blocked/restored at once instead of waiting for the 60s cache TTL.
   */
  private async syncBanCache(userId: string, banned: boolean): Promise<void> {
    await this.redis.set(`ban_check:${userId}`, banned ? 'banned' : 'active', 60);
  }

  /**
   * Check if user is allowed to start a game based on risk score.
   * Returns: { allowed, reason?, riskScore, penaltyTier }
   */
  async checkSessionAllowed(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    riskScore: number;
    penaltyTier: number;
  }> {
    const riskScore = await this.getRiskScore(userId);
    const penaltyTier = this.calculatePenaltyTier(riskScore);

    // Tier 3+: Check cooldown (6h lockout)
    if (penaltyTier >= 3) {
      const cooldownKey = `cooldown:${userId}`;
      const cooldownRemaining = await this.redis.get(cooldownKey);
      if (cooldownRemaining) {
        return {
          allowed: false,
          reason: `Account under cooldown. Try again later.`,
          riskScore,
          penaltyTier,
        };
      }
    }

    // Tier 4+: Blocked
    if (penaltyTier >= 4) {
      return {
        allowed: false,
        reason: 'Account suspended due to anti-cheat violations',
        riskScore,
        penaltyTier,
      };
    }

    // Tier 2: Check rate limit (5 sessions/hour)
    if (penaltyTier >= 2) {
      const rateKey = `rate:throttle:${userId}`;
      const count = await this.redis.get(rateKey);
      if (count && parseInt(count, 10) >= 5) {
        return {
          allowed: false,
          reason: 'Session rate limit reached (reduced due to suspicious activity)',
          riskScore,
          penaltyTier,
        };
      }
    }

    return { allowed: true, riskScore, penaltyTier };
  }

  /**
   * Track session start for rate limiting (Tier 2 throttle).
   */
  async trackSessionStart(userId: string): Promise<void> {
    const riskScore = await this.getRiskScore(userId);
    if (this.calculatePenaltyTier(riskScore) >= 2) {
      const rateKey = `rate:throttle:${userId}`;
      await this.redis.incr(rateKey);
      await this.redis.expire(rateKey, 3600); // 1 hour window
    }
  }

  private calculatePenaltyTier(riskScore: number): number {
    for (let i = PENALTY_THRESHOLDS.length - 1; i >= 0; i--) {
      if (riskScore >= PENALTY_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONCURRENT SESSION DETECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Register an active session in Redis. Returns previous session ID if one exists.
   */
  async registerActiveSession(userId: string, sessionId: string): Promise<string | null> {
    const key = `active_session:${userId}`;
    const previous = await this.redis.get(key);
    await this.redis.set(key, sessionId, 1800); // 30 min TTL
    return previous;
  }

  async clearActiveSession(userId: string): Promise<void> {
    await this.redis.del(`active_session:${userId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN ANALYSIS — All 7 detection types
  // ═══════════════════════════════════════════════════════════════

  async analyzeGameResult(params: {
    userId: string;
    sessionId: string;
    score: number;
    durationMs: number;
    gameType: GameType;
    movesHash?: string;
    inputSignature?: InputSignature;
    ipAddress?: string;
    deviceFingerprint?: string;
    mode?: string;
  }) {
    const { userId, sessionId, score, durationMs, gameType, movesHash, inputSignature, ipAddress, deviceFingerprint, mode } = params;
    const flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[] = [];

    // Load configurable thresholds
    const maxSessionsPerHour = await this.getSetting('max_sessions_per_hour', 20);
    const autoBanCriticalFlags = await this.getSetting('auto_ban_critical_flags', 3);
    const scoreAnomalyStdDevs = await this.getSetting('score_anomaly_std_devs', 3);

    // ─── 1. IMPOSSIBLE SCORE ─────────────────────────────────────
    const maxPossible = this.getMaxPossibleScore(gameType);
    if (score > maxPossible) {
      flags.push({
        type: 'IMPOSSIBLE_SCORE',
        severity: 'CRITICAL',
        details: { score, max_possible: maxPossible, game_type: gameType },
      });
    }

    // ─── 2. TIMING ANOMALY ───────────────────────────────────────
    const minReasonableTime = this.getMinReasonableTime(gameType);
    if (durationMs < minReasonableTime && score > 0) {
      flags.push({
        type: 'TIMING_ANOMALY',
        severity: 'HIGH',
        details: { duration_ms: durationMs, min_reasonable_ms: minReasonableTime },
      });
    }

    // ─── 3. SCORE ANOMALY (Statistical) ──────────────────────────
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

      if (stdDev > 0 && score > avg + scoreAnomalyStdDevs * stdDev) {
        flags.push({
          type: 'SCORE_ANOMALY',
          severity: 'MEDIUM',
          details: { score, average: avg, std_dev: stdDev, threshold: avg + scoreAnomalyStdDevs * stdDev },
        });
      }
    }

    // ─── 4. RAPID PROGRESSION ────────────────────────────────────
    const lastHourSessions = await this.prisma.gameSession.count({
      where: {
        user_id: userId,
        started_at: { gte: new Date(Date.now() - 3600000) },
        outcome: 'COMPLETED',
      },
    });

    if (lastHourSessions > maxSessionsPerHour) {
      flags.push({
        type: 'RAPID_PROGRESSION',
        severity: 'LOW',
        details: { sessions_last_hour: lastHourSessions, threshold: maxSessionsPerHour },
      });
    }

    // ─── 5. REPLAY DETECTION (SESSION_TAMPERING) ─────────────────
    if (movesHash && isValidMoveHash(movesHash)) {
      const duplicate = await this.prisma.gameSession.findFirst({
        where: {
          moves_hash: movesHash,
          game_type: gameType,
          id: { not: sessionId },
          outcome: 'COMPLETED',
        },
        select: { id: true, user_id: true },
      });

      if (duplicate) {
        const isSameUser = duplicate.user_id === userId;
        flags.push({
          type: 'SESSION_TAMPERING',
          severity: isSameUser ? 'HIGH' : 'CRITICAL',
          details: {
            detection: 'replay',
            moves_hash: movesHash,
            duplicate_session_id: duplicate.id,
            same_user: isSameUser,
            cross_user: !isSameUser ? duplicate.user_id : undefined,
          },
        });
      }
    }

    // ─── 6. INPUT BOT PATTERN ────────────────────────────────────
    if (inputSignature && inputSignature.totalInputs >= 10) {
      const botResult = detectBotPattern(inputSignature, gameType);
      if (botResult.isBot) {
        flags.push({
          type: 'INPUT_BOT_PATTERN',
          severity: botResult.severity,
          details: {
            confidence: botResult.confidence,
            reasons: botResult.reasons,
            signature_summary: {
              avg_interval: inputSignature.avgInterval,
              std_dev: inputSignature.stdDevInterval,
              total_inputs: inputSignature.totalInputs,
              first_input_at: inputSignature.firstInputAt,
            },
          },
        });
      }

      // Also check for pattern shift (human → bot transition)
      const historicalSessions = await this.prisma.gameSession.findMany({
        where: {
          user_id: userId,
          game_type: gameType,
          outcome: 'COMPLETED',
          input_signature: { not: Prisma.AnyNull },
          id: { not: sessionId },
        },
        orderBy: { completed_at: 'desc' },
        take: 5,
        select: { input_signature: true },
      });

      const historicalSignatures = historicalSessions
        .map((s) => s.input_signature as unknown as InputSignature)
        .filter((s) => s && s.avgInterval > 0);

      if (historicalSignatures.length >= 3) {
        const shiftResult = detectPatternShift(inputSignature, historicalSignatures);
        if (shiftResult.shifted) {
          flags.push({
            type: 'INPUT_BOT_PATTERN',
            severity: 'HIGH',
            details: { detection: 'pattern_shift', ...shiftResult },
          });
        }
      }
    }

    // ─── 7. DEVICE DUPLICATE ─────────────────────────────────────
    if (deviceFingerprint) {
      const deviceResult = await this.deviceDetection.detectDuplicateDevice(userId, deviceFingerprint);
      flags.push(...deviceResult.flags);
    }

    // IP correlation (tournament only)
    if (ipAddress && mode === 'TOURNAMENT') {
      const ipResult = await this.deviceDetection.detectIPCorrelation(userId, ipAddress, sessionId, mode);
      flags.push(...ipResult.flags);
    }

    // ═══════════════════════════════════════════════════════════════
    // STORE FLAGS + UPDATE RISK SCORE + ENFORCE PENALTIES
    // ═══════════════════════════════════════════════════════════════

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

      // Update risk score for each flag
      let finalRiskScore = 0;
      for (const flag of flags) {
        finalRiskScore = await this.addRiskPoints(userId, flag.severity);
      }

      // Apply progressive penalties
      await this.applyPenalties(userId, finalRiskScore, autoBanCriticalFlags);
    }

    return { flags_raised: flags.length, details: flags };
  }

  // ─── HEARTBEAT VERIFICATION ────────────────────────────────────

  /**
   * Record a session heartbeat. Game backends call this every 10s.
   */
  async recordHeartbeat(sessionId: string, sequence: number, clientTs: Date): Promise<void> {
    await this.prisma.sessionHeartbeat.create({
      data: { session_id: sessionId, sequence, client_ts: clientTs },
    });
    await this.redis.set(`heartbeat:${sessionId}`, String(sequence), 1800);
  }

  /**
   * Verify heartbeat count matches expected for game duration.
   * Missing >30s of heartbeats = SESSION_TAMPERING.
   */
  async verifyHeartbeats(sessionId: string, durationMs: number): Promise<{
    valid: boolean;
    flag?: { type: CheatFlagType; severity: CheatSeverity; details: any };
  }> {
    const expectedBeats = Math.max(0, Math.floor(durationMs / 10000) - 1);
    if (expectedBeats <= 1) return { valid: true }; // Game too short for heartbeat check

    const actualBeats = await this.prisma.sessionHeartbeat.count({
      where: { session_id: sessionId },
    });

    const missedBeats = expectedBeats - actualBeats;
    const missedSeconds = missedBeats * 10;

    // Allow up to 30s of missed heartbeats (network jitter, lag)
    if (missedSeconds > 30) {
      return {
        valid: false,
        flag: {
          type: 'SESSION_TAMPERING',
          severity: 'HIGH',
          details: {
            detection: 'missing_heartbeats',
            expected_beats: expectedBeats,
            actual_beats: actualBeats,
            missed_seconds: missedSeconds,
          },
        },
      };
    }

    return { valid: true };
  }

  // ─── REAL-TIME FLAG (Mid-game kill switch) ─────────────────────

  /**
   * Called by game backends when they detect physically impossible inputs in real-time.
   * Immediately disqualifies the session and raises a CRITICAL flag.
   */
  async flagRealtime(sessionId: string, userId: string, gameType: GameType, reason: string): Promise<{ action: 'TERMINATE' }> {
    // Disqualify the session
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { outcome: 'DISQUALIFIED', completed_at: new Date() },
    });

    // Raise critical flag
    await this.prisma.cheatFlag.create({
      data: {
        user_id: userId,
        session_id: sessionId,
        game_type: gameType,
        flag_type: 'SESSION_TAMPERING',
        severity: 'CRITICAL',
        details: { detection: 'realtime_impossible_input', reason },
      },
    });

    // Update risk score immediately
    await this.addRiskPoints(userId, 'CRITICAL');

    // Clear active session
    await this.clearActiveSession(userId);

    this.logger.warn(`REALTIME FLAG: User ${userId} session ${sessionId} — ${reason}`);

    return { action: 'TERMINATE' };
  }

  // ─── PROGRESSIVE PENALTY ENFORCEMENT ───────────────────────────

  private async applyPenalties(userId: string, riskScore: number, autoBanThreshold: number): Promise<void> {
    const tier = this.calculatePenaltyTier(riskScore);

    // Update penalty tier on user
    await this.prisma.user.update({
      where: { id: userId },
      data: { penalty_tier: tier },
    });

    if (tier >= 3) {
      // Set 6-hour cooldown
      await this.redis.set(`cooldown:${userId}`, '1', 21600);
    }

    if (tier >= 4) {
      // Temp ban (24h) — set ban but don't set perma flag
      await this.prisma.user.update({
        where: { id: userId },
        data: { is_banned: true, ban_reason: 'Automated: Temporary ban (24h) due to anti-cheat violations' },
      });
      // Schedule unban in Redis (24h key)
      await this.redis.set(`tempban:${userId}`, '1', 86400);
      await this.syncBanCache(userId, true);
    }

    // Check critical count for perma-ban (Tier 5)
    const criticalCount = await this.prisma.cheatFlag.count({
      where: { user_id: userId, severity: 'CRITICAL' },
    });

    if (criticalCount >= autoBanThreshold || tier >= 5) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          is_banned: true,
          ban_reason: 'Automated: Permanent ban — multiple critical anti-cheat violations',
          penalty_tier: 5,
        },
      });
      await this.syncBanCache(userId, true);
      this.logger.warn(`PERMA-BAN: User ${userId} — ${criticalCount} critical flags`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

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
      await this.syncBanCache(flag.user_id, true);
    }

    if (action === 'dismiss') {
      // Reduce risk score on dismiss (admin reviewed and found false positive)
      const currentRisk = await this.getRiskScore(flag.user_id);
      const reduction = RISK_POINTS[flag.severity as CheatSeverity] || 10;
      const newRisk = Math.max(0, currentRisk - reduction);
      if (newRisk === 0) {
        await this.redis.del(`risk:${flag.user_id}`);
      } else {
        await this.redis.set(`risk:${flag.user_id}`, String(newRisk), 86400);
      }
    }

    return flag;
  }

  async banUser(userId: string, reason: string) {
    await this.redis.set(`risk:${userId}`, '150', 86400); // Set max risk
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { is_banned: true, ban_reason: reason, penalty_tier: 5 },
    });
    await this.syncBanCache(userId, true);
    return result;
  }

  async unbanUser(userId: string) {
    await this.resetRiskScore(userId);
    await this.redis.del(`cooldown:${userId}`);
    await this.redis.del(`tempban:${userId}`);
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { is_banned: false, ban_reason: null, penalty_tier: 0 },
    });
    await this.syncBanCache(userId, false);
    return result;
  }

  async getUserFlags(userId: string) {
    const [flags, riskScore] = await Promise.all([
      this.prisma.cheatFlag.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.getRiskScore(userId),
    ]);

    const summary = {
      total: flags.length,
      risk_score: riskScore,
      penalty_tier: this.calculatePenaltyTier(riskScore),
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

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

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
