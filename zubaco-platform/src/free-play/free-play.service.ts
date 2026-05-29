import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EnergyService } from './energy.service';
import { GameType } from '.prisma/client';

@Injectable()
export class FreePlayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly energyService: EnergyService,
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
    // Try to get stored config
    let config = await this.prisma.levelConfig.findUnique({
      where: { game_type_level: { game_type: gameType, level } },
    });

    if (!config) {
      // Generate default config based on level using scaling formula
      const generatedConfig = this.generateLevelConfig(gameType, level);
      config = await this.prisma.levelConfig.create({
        data: { game_type: gameType, level, config: generatedConfig },
      });
    }

    return config;
  }

  // ─── START FREE PLAY SESSION ───────────────────────────────────

  async startLevel(userId: string, gameType: GameType, level: number) {
    const progress = await this.getGameProgress(userId, gameType);

    // Check if level is unlocked (must have completed previous level, or level 1)
    if (level > 1 && level > progress.highest_level + 1) {
      throw new BadRequestException(`Level ${level} is locked. Complete level ${progress.highest_level} first.`);
    }

    // Consume a life
    await this.energyService.consumeLife(userId);

    const levelConfig = await this.getLevelConfig(gameType, level);

    // Create game session
    const serverSeed = this.generateServerSeed();
    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: gameType,
        mode: 'FREE_PLAY',
        level,
        server_seed: serverSeed,
        config: levelConfig.config as any,
      },
    });

    return {
      session_id: session.id,
      server_seed: serverSeed,
      config: levelConfig.config,
      level,
    };
  }

  // ─── SUBMIT LEVEL RESULT ───────────────────────────────────────

  async submitResult(
    userId: string,
    sessionId: string,
    score: number,
    durationMs: number,
    metadata?: any,
  ) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, outcome: null },
    });

    if (!session) {
      throw new NotFoundException('Game session not found or already completed');
    }

    // Update session
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score,
        duration_ms: durationMs,
        outcome: 'COMPLETED',
        completed_at: new Date(),
        metadata: metadata || undefined,
      },
    });

    // Calculate stars (1-3 based on score thresholds)
    const stars = this.calculateStars(score, session.config as any);

    // Update progress
    const progress = await this.prisma.gameProgress.findUnique({
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

      await this.prisma.gameProgress.update({
        where: { id: progress.id },
        data: updates,
      });

      // Upsert level result
      if (session.level) {
        await this.prisma.levelResult.upsert({
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

    // Award XP
    const xpEarned = this.calculateXp(stars, session.level || 1);
    await this.usersService.addXp(userId, xpEarned);

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

  private generateServerSeed(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
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
