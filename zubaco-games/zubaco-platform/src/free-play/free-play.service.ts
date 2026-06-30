import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EnergyService } from './energy.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { DeviceDetectionService } from '../anti-cheat/device-detection.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoreValidatorService } from '../game-session/score-validator.service';
import { generateServerSeed, hashServerSeed } from '../game-session/seed-rng';
import { MIN_SESSION_DURATION_MS, MAX_SESSION_DURATION_MS } from '../game-session/constants';
import { GameType } from '.prisma/client';

const MAX_FREE_PLAY_LEVEL = 999;

@Injectable()
export class FreePlayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly energyService: EnergyService,
    private readonly antiCheat: AntiCheatService,
    private readonly deviceDetection: DeviceDetectionService,
    private readonly leaderboard: LeaderboardService,
    private readonly scoreValidator: ScoreValidatorService,
  ) {}

  // ─── GET PROGRESS FOR ALL GAMES ───────────────────────────────

  async getAllProgress(userId: string) {
    const progress = await this.prisma.gameProgress.findMany({
      where: { user_id: userId },
      include: {
        level_results: {
          orderBy: { level: 'asc' },
          select: { level: true, stars: true, best_score: true, completed: true },
        },
      },
    });

    // Return progress keyed by game type, fill in defaults for games not yet started
    const allGames = Object.values(GameType) as string[];
    const progressMap: Record<string, any> = {};

    for (const game of allGames) {
      const found = progress.find((p) => p.game_type === game);
      progressMap[game] = found
        ? {
            current_level: found.current_level,
            highest_level: found.highest_level,
            total_plays: found.total_plays,
            best_score: found.best_score,
            levels: found.level_results,
          }
        : {
            current_level: 1,
            highest_level: 1,
            total_plays: 0,
            best_score: 0,
            levels: [],
          };
    }

    return progressMap;
  }

  // ─── GET PROGRESS FOR SINGLE GAME ─────────────────────────────

  async getGameProgress(userId: string, gameType: GameType) {
    let progress = await this.prisma.gameProgress.findUnique({
      where: { user_id_game_type: { user_id: userId, game_type: gameType } },
      include: {
        level_results: { orderBy: { level: 'asc' } },
      },
    });

    if (!progress) {
      progress = await this.prisma.gameProgress.create({
        data: { user_id: userId, game_type: gameType },
        include: { level_results: { orderBy: { level: 'asc' } } },
      });
    }

    return progress;
  }

  // ─── GET LEVEL CONFIG ──────────────────────────────────────────

  async getLevelConfig(gameType: GameType, level: number) {
    // Validate inputs to prevent unbounded / invalid lookups.
    if (!Object.values(GameType).includes(gameType)) {
      throw new BadRequestException(`Unknown game type: ${gameType}`);
    }
    if (!Number.isInteger(level) || level < 1 || level > MAX_FREE_PLAY_LEVEL) {
      throw new BadRequestException(`Level must be an integer between 1 and ${MAX_FREE_PLAY_LEVEL}`);
    }

    // Read the stored config if an admin has defined one; otherwise return an
    // ephemerally generated config. This is a pure read — it never persists a
    // row, so an authenticated caller cannot trigger unbounded row creation.
    const stored = await this.prisma.levelConfig.findUnique({
      where: { game_type_level: { game_type: gameType, level } },
    });

    if (stored) return stored;

    return {
      id: null,
      game_type: gameType,
      level,
      config: this.generateLevelConfig(gameType, level),
    };
  }

  // ─── START FREE PLAY SESSION ───────────────────────────────────

  async startLevel(
    userId: string,
    gameType: GameType,
    level: number,
    clientSeed?: string,
    options?: { ipAddress?: string; deviceFingerprint?: string; deviceComponents?: any },
  ) {
    if (!Object.values(GameType).includes(gameType)) {
      throw new BadRequestException(`Unknown game type: ${gameType}`);
    }
    if (!Number.isInteger(level) || level < 1 || level > MAX_FREE_PLAY_LEVEL) {
      throw new BadRequestException(`Level must be an integer between 1 and ${MAX_FREE_PLAY_LEVEL}`);
    }

    // ─── ANTI-CHEAT: Check if user is allowed to play ────────────
    const sessionCheck = await this.antiCheat.checkSessionAllowed(userId);
    if (!sessionCheck.allowed) {
      throw new ForbiddenException(sessionCheck.reason);
    }

    const progress = await this.getGameProgress(userId, gameType);

    // Check if level is unlocked (must have completed previous level, or level 1)
    if (level > 1 && level > progress.highest_level + 1) {
      throw new BadRequestException(`Level ${level} is locked. Complete level ${progress.highest_level} first.`);
    }

    // Resolve config BEFORE charging a life so a config failure never costs one.
    const levelConfig = await this.getLevelConfig(gameType, level);

    // Consume a life first (most common failure point); if the user has none,
    // nothing else has been mutated yet.
    await this.energyService.consumeLife(userId);

    // Concurrent-session prevention (single active session per user).
    await this.abandonPreviousSession(userId);
    await this.antiCheat.trackSessionStart(userId);

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);

    let session;
    try {
      session = await this.prisma.gameSession.create({
        data: {
          user_id: userId,
          game_type: gameType,
          mode: 'FREE_PLAY',
          level,
          server_seed: serverSeed,
          client_seed: clientSeed || null,
          config: levelConfig.config as any,
          ip_address: options?.ipAddress || null,
          device_fingerprint: options?.deviceFingerprint || null,
        },
      });
    } catch (err) {
      // Refund the life if the session could not be created (GAME-EC-01).
      await this.energyService.refundLife(userId).catch(() => undefined);
      throw err;
    }

    // Register the active session for concurrency/heartbeat tracking.
    await this.antiCheat.registerActiveSession(userId, session.id);

    // ─── ANTI-CHEAT: Register device fingerprint (ACHEAT-VAL-07) ────
    if (options?.deviceFingerprint) {
      try {
        await this.deviceDetection.upsertFingerprint(
          userId,
          options.deviceFingerprint,
          options.deviceComponents,
        );
      } catch { /* non-blocking */ }
    }

    return {
      session_id: session.id,
      // Only the commitment hash is revealed before play (provable fairness);
      // the raw server seed is revealed via session state after completion.
      server_seed_hash: serverSeedHash,
      config: levelConfig.config,
      level,
    };
  }

  /**
   * Register a freshly created active session and abandon any prior open
   * free-play/generic session for the same user.
   */
  private async abandonPreviousSession(userId: string): Promise<void> {
    const previousSession = await this.antiCheat.registerActiveSession(userId, 'pending');
    if (previousSession && previousSession !== 'pending') {
      await this.prisma.gameSession.updateMany({
        where: { id: previousSession, outcome: null },
        data: { outcome: 'ABANDONED', completed_at: new Date() },
      });
    }
  }

  // ─── SUBMIT LEVEL RESULT ───────────────────────────────────────

  async submitResult(
    userId: string,
    sessionId: string,
    score: number,
    durationMs: number,
    metadata?: any,
  ) {
    // Hard bounds (mirrors the generic game-session submit path).
    if (score < 0) throw new ForbiddenException('Invalid score');
    if (durationMs < MIN_SESSION_DURATION_MS) throw new ForbiddenException('Invalid duration');
    if (durationMs > MAX_SESSION_DURATION_MS) throw new ForbiddenException('Session timeout exceeded');

    // This path finalizes ONLY free-play level sessions (mode FREE_PLAY with a
    // level). Tournament and generic sessions are finalized by their own engines.
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, outcome: null, mode: 'FREE_PLAY', level: { not: null } },
    });

    if (!session) {
      throw new NotFoundException('Game session not found or already completed');
    }

    // Plausibility: duration cannot exceed the real elapsed session age.
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    if (durationMs > elapsed + 5000) {
      throw new ForbiddenException('Duration exceeds session age');
    }

    // Server-side score validation against the game's theoretical bounds.
    const validation = this.scoreValidator.validateScore(
      session.game_type,
      session.config as Record<string, any>,
      score,
      durationMs,
    );
    if (!validation.valid) {
      throw new ForbiddenException(`Score rejected: ${validation.reason}`);
    }

    // Calculate stars (0-3 based on score thresholds)
    const stars = this.calculateStars(score, session.config as any);

    // Atomic submit: claim the session (double-submit guard) and persist all
    // progress side effects in a single transaction so a partial failure cannot
    // leave a completed session without progress, or double-process on a race.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: sessionId, user_id: userId, outcome: null, mode: 'FREE_PLAY', level: { not: null } },
        data: {
          score,
          duration_ms: durationMs,
          outcome: 'COMPLETED',
          completed_at: new Date(),
          metadata: metadata || undefined,
        },
      });

      if (claimed.count === 0) {
        throw new ConflictException('Game session already completed');
      }

      const progress = await tx.gameProgress.findUnique({
        where: { user_id_game_type: { user_id: userId, game_type: session.game_type } },
      });

      if (progress) {
        const updates: any = {
          total_plays: { increment: 1 },
          best_score: score > progress.best_score ? score : progress.best_score,
        };

        // Unlock next level if current level completed with at least 1 star
        if (session.level && stars >= 1 && session.level >= progress.highest_level) {
          updates.highest_level = session.level + 1;
          updates.current_level = session.level + 1;
        }

        await tx.gameProgress.update({
          where: { id: progress.id },
          data: updates,
        });

        // Upsert level result
        if (session.level) {
          await tx.levelResult.upsert({
            where: { progress_id_level: { progress_id: progress.id, level: session.level } },
            create: {
              progress_id: progress.id,
              level: session.level,
              stars,
              best_score: score,
              attempts: 1,
              completed: stars >= 1,
              first_completed: stars >= 1 ? new Date() : null,
            },
            update: {
              stars: { set: stars },
              best_score: score,
              attempts: { increment: 1 },
              ...(stars >= 1 && { completed: true }),
            },
          });
        }
      }
    });

    // Re-read progress for the response (post-transaction state).
    const progress = await this.prisma.gameProgress.findUnique({
      where: { user_id_game_type: { user_id: userId, game_type: session.game_type } },
    });

    // Clear the active-session lock now that the session is finalized.
    await this.antiCheat.clearActiveSession(userId);

    // Award XP
    const xpEarned = this.calculateXp(stars, session.level || 1);
    await this.usersService.addXp(userId, xpEarned);

    // Run anti-cheat analysis (non-blocking), including heartbeat verification
    // for long sessions — consistent with the generic submit path.
    try {
      if (durationMs > 15000) {
        const hbResult = await this.antiCheat.verifyHeartbeats(sessionId, durationMs);
        if (!hbResult.valid && hbResult.flag) {
          await this.prisma.cheatFlag.create({
            data: {
              user_id: userId,
              session_id: sessionId,
              game_type: session.game_type,
              flag_type: hbResult.flag.type,
              severity: hbResult.flag.severity,
              details: hbResult.flag.details,
            },
          });
        }
      }

      await this.antiCheat.analyzeGameResult({
        userId,
        sessionId,
        score,
        durationMs,
        gameType: session.game_type,
        ipAddress: session.ip_address || undefined,
        deviceFingerprint: session.device_fingerprint || undefined,
        mode: session.mode,
        maxPossibleScore: validation.theoretical_max,
      });
    } catch { /* anti-cheat failure shouldn't block game completion */ }

    // Update leaderboard
    try {
      await this.leaderboard.updateScore(userId, session.game_type, score);
    } catch { /* leaderboard failure shouldn't block game completion */ }

    return {
      score,
      stars,
      xp_earned: xpEarned,
      level_completed: stars >= 1,
      next_level_unlocked: stars >= 1 && session.level === progress?.highest_level,
    };
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private calculateStars(score: number, config: any): number {
    // Star thresholds (can be customized per game via config)
    const maxScore = config?.max_score || 100;
    const pct = score / maxScore;

    if (pct >= 0.9) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  }

  private calculateXp(stars: number, level: number): number {
    const baseXp = 10;
    return baseXp * stars * Math.min(level, 10);
  }

  private generateLevelConfig(gameType: GameType, level: number): any {
    // Universal scaling formula
    // Level 1-10: fixed configs, Level 11+: endless scaling
    const base = this.getBaseConfig(gameType);
    const scaleFactor = level <= 10 ? level / 10 : 1 + (level - 10) * 0.1;

    return {
      level,
      time_limit: Math.max(30, Math.round(base.time_limit * (1 - scaleFactor * 0.05))),
      grid_size: Math.min(base.max_grid, Math.round(base.min_grid + scaleFactor * (base.max_grid - base.min_grid))),
      speed: Math.min(base.max_speed, base.min_speed + scaleFactor * (base.max_speed - base.min_speed)),
      elements: Math.min(base.max_elements, Math.round(base.min_elements + scaleFactor * (base.max_elements - base.min_elements))),
      display_duration: Math.max(1, Math.round(base.display_duration * (1 - scaleFactor * 0.06))),
      max_score: 100 + level * 10,
    };
  }

  private getBaseConfig(gameType: GameType) {
    // Default base configs per game (can be overridden by admin)
    const defaults: Record<string, any> = {
      SEQUENCE_RECALL: { time_limit: 180, min_grid: 4, max_grid: 9, min_speed: 1, max_speed: 3, min_elements: 3, max_elements: 12, display_duration: 10 },
      MEMORY_CARD_MATCHING: { time_limit: 180, min_grid: 4, max_grid: 8, min_speed: 1, max_speed: 2, min_elements: 6, max_elements: 20, display_duration: 5 },
      FLASH_SPOT: { time_limit: 120, min_grid: 3, max_grid: 6, min_speed: 1, max_speed: 5, min_elements: 3, max_elements: 10, display_duration: 8 },
      OBJECT_PLACEMENT_MEMORY: { time_limit: 120, min_grid: 3, max_grid: 7, min_speed: 1, max_speed: 2, min_elements: 4, max_elements: 12, display_duration: 5 },
      SLIDING_PUZZLE: { time_limit: 180, min_grid: 3, max_grid: 6, min_speed: 1, max_speed: 1, min_elements: 8, max_elements: 35, display_duration: 10 },
      BLOCK_FILL: { time_limit: 180, min_grid: 5, max_grid: 9, min_speed: 1, max_speed: 1, min_elements: 3, max_elements: 8, display_duration: 10 },
      COLOUR_SORTING: { time_limit: 180, min_grid: 4, max_grid: 8, min_speed: 1, max_speed: 1, min_elements: 4, max_elements: 10, display_duration: 10 },
      RAPID_CATEGORY_SORT: { time_limit: 90, min_grid: 2, max_grid: 4, min_speed: 2, max_speed: 6, min_elements: 15, max_elements: 40, display_duration: 5 },
      MAZE_NAVIGATION: { time_limit: 180, min_grid: 8, max_grid: 25, min_speed: 1, max_speed: 2, min_elements: 1, max_elements: 5, display_duration: 10 },
      INFINITY_LOOP: { time_limit: 180, min_grid: 4, max_grid: 8, min_speed: 1, max_speed: 1, min_elements: 16, max_elements: 64, display_duration: 10 },
      WORD_UNSCRAMBLE: { time_limit: 120, min_grid: 4, max_grid: 8, min_speed: 2, max_speed: 6, min_elements: 10, max_elements: 25, display_duration: 6 },
      TRUE_FALSE_BLITZ: { time_limit: 60, min_grid: 1, max_grid: 1, min_speed: 2, max_speed: 5, min_elements: 20, max_elements: 40, display_duration: 2 },
      ARROWS: { time_limit: 180, min_grid: 3, max_grid: 7, min_speed: 1, max_speed: 3, min_elements: 5, max_elements: 15, display_duration: 10 },
      LOGIC_REFLECTOR: { time_limit: 180, min_grid: 4, max_grid: 8, min_speed: 1, max_speed: 1, min_elements: 3, max_elements: 8, display_duration: 10 },
      NUMBER_GRID_SPRINT: { time_limit: 120, min_grid: 4, max_grid: 6, min_speed: 2, max_speed: 5, min_elements: 16, max_elements: 36, display_duration: 3 },
      LIVE_ROUTE_BUILDER: { time_limit: 120, min_grid: 5, max_grid: 12, min_speed: 2, max_speed: 5, min_elements: 8, max_elements: 20, display_duration: 5 },
      MEMORY_GROUPS: { time_limit: 90, min_grid: 3, max_grid: 5, min_speed: 1, max_speed: 1, min_elements: 9, max_elements: 20, display_duration: 5 },
      REFLEX_ENDURANCE: { time_limit: 300, min_grid: 3, max_grid: 6, min_speed: 1, max_speed: 8, min_elements: 50, max_elements: 200, display_duration: 10 },
      PATTERN_SURVIVAL: { time_limit: 300, min_grid: 3, max_grid: 3, min_speed: 1, max_speed: 4, min_elements: 3, max_elements: 20, display_duration: 8 },
      SPEED_TYPE_ANSWER: { time_limit: 120, min_grid: 1, max_grid: 1, min_speed: 2, max_speed: 5, min_elements: 10, max_elements: 25, display_duration: 3 },
    };

    return defaults[gameType] || defaults.SEQUENCE_RECALL;
  }
}
