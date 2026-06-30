import { Injectable } from '@nestjs/common';
import { GameType } from '.prisma/client';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  theoretical_max?: number;
}

export interface ScoreBreakdown {
  base_score: number;
  time_bonus: number;
  penalties: number;
  final_score: number;
}

export interface PenaltyInfo {
  per_wrong: number;
  label: string;
}

export interface TimeBonusInfo {
  multiplier: number;
  max: number;
  formula: string;
}

/**
 * Centralized penalty configuration per game.
 */
const PENALTY_CONFIG: Partial<Record<GameType, PenaltyInfo>> = {
  TRUE_FALSE_BLITZ: { per_wrong: 5, label: 'wrong answer' },
  RAPID_CATEGORY_SORT: { per_wrong: 5, label: 'wrong category' },
  FLASH_SPOT: { per_wrong: 10, label: 'wrong tap' },
  WORD_UNSCRAMBLE: { per_wrong: 5, label: 'wrong letter order' },
  REFLEX_ENDURANCE: { per_wrong: 3, label: 'missed target' },
  COLOUR_SORTING: { per_wrong: 10, label: 'inefficient move' },
  NUMBER_GRID_SPRINT: { per_wrong: 5, label: 'wrong number' },
  PATTERN_SURVIVAL: { per_wrong: 0, label: 'game ends on mistake' },
};

/**
 * Time bonus configuration per game.
 */
const TIME_BONUS_CONFIG: Partial<Record<GameType, TimeBonusInfo>> = {
  SLIDING_PUZZLE: { multiplier: 10, max: 10, formula: 'floor(10 × remaining/total)' },
  ARROWS: { multiplier: 10, max: 10, formula: 'floor(10 × remaining/total)' },
  SEQUENCE_RECALL: { multiplier: 1, max: 300, formula: 'floor(time_left × 1.0)' },
  MEMORY_CARD_MATCHING: { multiplier: 1, max: 180, formula: 'remaining_seconds' },
  INFINITY_LOOP: { multiplier: 1, max: 60, formula: 'remaining_per_board' },
  BLOCK_FILL: { multiplier: 1, max: 180, formula: 'remaining_seconds' },
  MAZE_NAVIGATION: { multiplier: 5, max: 5, formula: 'floor(5 × remaining/total)' },
  FLASH_SPOT: { multiplier: 10, max: 10, formula: 'floor(10 × remaining/total)' },
  OBJECT_PLACEMENT_MEMORY: { multiplier: 5, max: 5, formula: 'floor(5 × remaining/total)' },
  COLOUR_SORTING: { multiplier: 10, max: 10, formula: 'floor(10 × remaining/total)' },
  NUMBER_GRID_SPRINT: { multiplier: 2, max: 360, formula: 'remaining × 2' },
  MEMORY_GROUPS: { multiplier: 3, max: 540, formula: 'remaining × 3' },
  WORD_UNSCRAMBLE: { multiplier: 6, max: 150, formula: '6pts per word time bonus' },
  SPEED_TYPE_ANSWER: { multiplier: 10, max: 250, formula: 'speed_bonus per answer (max 10)' },
  LOGIC_REFLECTOR: { multiplier: 10, max: 10, formula: 'floor(10 × remaining/total)' },
  LIVE_ROUTE_BUILDER: { multiplier: 0, max: 0, formula: 'path_efficiency (no time bonus)' },
  RAPID_CATEGORY_SORT: { multiplier: 0, max: 0, formula: 'none - speed IS the score' },
  REFLEX_ENDURANCE: { multiplier: 0, max: 0, formula: 'none - endurance IS the score' },
  PATTERN_SURVIVAL: { multiplier: 0, max: 0, formula: 'round bonuses only' },
};

/**
 * Base points per correct action, per game.
 */
const BASE_POINTS: Record<string, number> = {
  SLIDING_PUZZLE: 100,
  ARROWS: 50,
  SEQUENCE_RECALL: 10,
  MEMORY_CARD_MATCHING: 100,
  INFINITY_LOOP: 10,
  BLOCK_FILL: 100,
  MAZE_NAVIGATION: 100,
  TRUE_FALSE_BLITZ: 10,
  FLASH_SPOT: 20,
  COLOUR_SORTING: 100,
  RAPID_CATEGORY_SORT: 10,
  WORD_UNSCRAMBLE: 15,
  NUMBER_GRID_SPRINT: 10,
  LIVE_ROUTE_BUILDER: 10,
  MEMORY_GROUPS: 50,
  REFLEX_ENDURANCE: 2,
  PATTERN_SURVIVAL: 20,
  SPEED_TYPE_ANSWER: 20,
  LOGIC_REFLECTOR: 100,
  OBJECT_PLACEMENT_MEMORY: 100,
};

/**
 * Server-side score validation + scoring engine.
 * - Validates scores against theoretical maximum bounds
 * - Provides centralized penalty/bonus configuration
 * - Calculates score breakdowns for frontend display
 */
@Injectable()
export class ScoreValidatorService {
  // ─── VALIDATION ─────────────────────────────────────────────────

  validateScore(
    gameType: GameType,
    config: Record<string, any>,
    score: number,
    durationMs: number,
  ): ValidationResult {
    const theoreticalMax = this.computeTheoreticalMax(gameType, config, durationMs);

    // Allow 10% margin for floating point / rounding differences
    const maxAllowed = Math.ceil(theoreticalMax * 1.1);

    if (score > maxAllowed) {
      return {
        valid: false,
        reason: `Score ${score} exceeds theoretical maximum ${theoreticalMax} for ${gameType}`,
        theoretical_max: theoreticalMax,
      };
    }

    return { valid: true, theoretical_max: theoreticalMax };
  }

  // ─── SCORING CONFIG ─────────────────────────────────────────────

  /**
   * Get the full scoring configuration for a game type.
   * Used by frontends to display score breakdown.
   */
  getScoringConfig(gameType: GameType) {
    return {
      game_type: gameType,
      base_points_per_action: BASE_POINTS[gameType] ?? 10,
      penalty: PENALTY_CONFIG[gameType] ?? null,
      time_bonus: TIME_BONUS_CONFIG[gameType] ?? null,
    };
  }

  getPenaltyConfig(gameType: GameType): PenaltyInfo | null {
    return PENALTY_CONFIG[gameType] ?? null;
  }

  getTimeBonusConfig(gameType: GameType): TimeBonusInfo | null {
    return TIME_BONUS_CONFIG[gameType] ?? null;
  }

  // ─── SCORE BREAKDOWN CALCULATOR ─────────────────────────────────

  /**
   * Calculate score breakdown for display purposes.
   * Actual scoring is authoritative in each game backend — this is a reference calculator.
   */
  calculateScoreBreakdown(
    gameType: GameType,
    correctActions: number,
    wrongActions: number,
    timeLimitMs: number,
    remainingTimeMs: number,
  ): ScoreBreakdown {
    const ratio = timeLimitMs > 0 ? Math.max(0, remainingTimeMs / timeLimitMs) : 0;
    const timeLimitSec = timeLimitMs / 1000;

    // Base score
    const basePoints = BASE_POINTS[gameType] ?? 10;
    const base_score = correctActions * basePoints;

    // Time bonus
    const tbConfig = TIME_BONUS_CONFIG[gameType];
    let time_bonus = 0;
    if (tbConfig && tbConfig.multiplier > 0) {
      time_bonus = Math.min(Math.floor(tbConfig.multiplier * ratio * timeLimitSec), tbConfig.max);
    }

    // Penalties
    const penConfig = PENALTY_CONFIG[gameType];
    const penalties = penConfig ? wrongActions * penConfig.per_wrong : 0;

    const final_score = Math.max(0, base_score + time_bonus - penalties);

    return { base_score, time_bonus, penalties, final_score };
  }

  // ─── THEORETICAL MAX ────────────────────────────────────────────

  // Upper bounds applied to client-supplied difficulty config before it is used
  // to derive a theoretical-max ceiling. Prevents a client from inflating its own
  // accepted-score ceiling via oversized config (SCORE-CFG-01). These caps are
  // generous (well above any legitimate game configuration) so they never reject
  // a real score; they only stop pathological inputs.
  private static readonly MAX_TIME_LIMIT_SEC = 600; // 10 minutes
  private static readonly MIN_TIME_LIMIT_SEC = 1;
  private static readonly MAX_COUNT = 500; // rounds / elements / cells / etc.
  private static readonly MAX_SCORE_PER_CLICK = 100;
  private static readonly MAX_BONUS_TIME_RATIO = 5;

  /**
   * Clamp the numeric fields of a (potentially client-supplied) game config to
   * sane upper/lower bounds so theoretical-max derivation cannot be inflated by a
   * malicious or malformed config (SCORE-CFG-01).
   */
  private sanitizeConfig(config: Record<string, any> | null | undefined): Record<string, any> {
    const c = config ?? {};
    const clampCount = (v: any): number | undefined => {
      const n = Number(v);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(ScoreValidatorService.MAX_COUNT, Math.max(1, Math.floor(n)));
    };

    const rawTime = Number(c.time_limit);
    const time_limit = Number.isFinite(rawTime)
      ? Math.min(ScoreValidatorService.MAX_TIME_LIMIT_SEC, Math.max(ScoreValidatorService.MIN_TIME_LIMIT_SEC, rawTime))
      : undefined;

    const rawSpc = Number(c.score_per_click);
    const score_per_click = Number.isFinite(rawSpc)
      ? Math.min(ScoreValidatorService.MAX_SCORE_PER_CLICK, Math.max(1, rawSpc))
      : undefined;

    const rawRatio = Number(c.bonus_time_ratio);
    const bonus_time_ratio = Number.isFinite(rawRatio)
      ? Math.min(ScoreValidatorService.MAX_BONUS_TIME_RATIO, Math.max(0, rawRatio))
      : undefined;

    return {
      ...c,
      ...(time_limit !== undefined ? { time_limit } : {}),
      ...(clampCount(c.total_rounds) !== undefined ? { total_rounds: clampCount(c.total_rounds) } : {}),
      ...(clampCount(c.elements) !== undefined ? { elements: clampCount(c.elements) } : {}),
      ...(clampCount(c.max_elements) !== undefined ? { max_elements: clampCount(c.max_elements) } : {}),
      ...(score_per_click !== undefined ? { score_per_click } : {}),
      ...(bonus_time_ratio !== undefined ? { bonus_time_ratio } : {}),
    };
  }

  private computeTheoreticalMax(gameType: GameType, rawConfig: Record<string, any>, durationMs: number): number {
    const config = this.sanitizeConfig(rawConfig);
    const timeLimit = config?.time_limit ?? 180; // seconds (sanitized)
    const totalRounds = config?.total_rounds ?? config?.elements ?? 10;

    switch (gameType) {
      case 'SLIDING_PUZZLE': {
        // Completed Round: 100pts, Time Bonus: max 10 (TIME_BONUS_CONFIG.max)
        const rounds = totalRounds || 5;
        return rounds * 100 + (TIME_BONUS_CONFIG.SLIDING_PUZZLE?.max ?? 10);
      }

      case 'ARROWS': {
        // Completed Round: 50pts, Time Bonus: floor(10 × remaining/total)
        const rounds = totalRounds || 10;
        return rounds * 50 + 10;
      }

      case 'SEQUENCE_RECALL': {
        // score = successful_moves × scorePerClick + time_bonus
        // Max moves in time: roughly timeLimit clicks at 1/sec
        const scorePerClick = config?.score_per_click ?? 10;
        const maxMoves = Math.min(timeLimit, 500); // can't exceed timeLimit clicks
        const bonusTimeRatio = config?.bonus_time_ratio ?? 1;
        return maxMoves * scorePerClick + Math.floor(timeLimit * bonusTimeRatio);
      }

      case 'MEMORY_CARD_MATCHING': {
        // Completed Level: 100pts per level, Time Bonus: remaining seconds
        const levels = totalRounds || 10;
        return levels * 100 + timeLimit;
      }

      case 'INFINITY_LOOP': {
        // Solved Board: 10 + remaining_seconds_on_that_board
        const boards = totalRounds || 20;
        const perBoardTime = timeLimit / boards;
        return boards * (10 + Math.floor(perBoardTime));
      }

      case 'BLOCK_FILL': {
        // Hard boards: 40pts each, End Bonus: remaining seconds
        const boards = totalRounds || 10;
        return boards * 100 + timeLimit; // generous: assume all expert boards
      }

      case 'MAZE_NAVIGATION': {
        // Optimal path: 100pts per round, Time Bonus: floor(5 × remaining/total)
        const rounds = totalRounds || 5;
        return rounds * 100 + 5;
      }

      case 'FLASH_SPOT': {
        // Correct tap: 20pts, Time Bonus: floor(10 × remaining/total)
        const maxChanges = config?.elements ?? config?.max_elements ?? 30;
        return maxChanges * 20 + 10;
      }

      case 'OBJECT_PLACEMENT_MEMORY': {
        // (correct/total) × 100 per round + per-round time bonus (max 5).
        // Scales with round count so legitimate multi-round scores are not
        // falsely rejected (SCORE-CALC-01).
        const rounds = totalRounds || 5;
        return rounds * (100 + (TIME_BONUS_CONFIG.OBJECT_PLACEMENT_MEMORY?.max ?? 5));
      }

      case 'COLOUR_SORTING': {
        // 100pts per tube + efficiency bonus + time bonus
        const tubes = config?.elements ?? 8;
        return tubes * 100 + 200 + 10; // generous efficiency + time bonus
      }

      case 'RAPID_CATEGORY_SORT': {
        // Correct: 10pts each, no time bonus (speed IS score)
        const maxItems = config?.elements ?? config?.max_elements ?? 40;
        return maxItems * 10;
      }

      case 'WORD_UNSCRAMBLE': {
        // 15pts per word + time bonuses per word
        const maxWords = config?.elements ?? 25;
        return maxWords * 15 + maxWords * 6; // max time bonus per word ~6s
      }

      case 'TRUE_FALSE_BLITZ': {
        // 10pts per correct + streak bonus (5 per streak item after 3)
        const statements = config?.elements ?? 30;
        const streakBonus = Math.max(0, statements - 3) * 5;
        return statements * 10 + streakBonus;
      }

      case 'NUMBER_GRID_SPRINT': {
        // 10pts per cell + time bonus
        const cells = config?.elements ?? 36;
        return cells * 10 + timeLimit * 2;
      }

      case 'LIVE_ROUTE_BUILDER': {
        // Path efficiency 100 + 10 per node
        const nodes = config?.elements ?? 20;
        return 100 + nodes * 10;
      }

      case 'MEMORY_GROUPS': {
        // 50pts per group + time bonus
        const groups = Math.ceil((config?.elements ?? 9) / 3);
        return groups * 50 + timeLimit * 3;
      }

      case 'REFLEX_ENDURANCE': {
        // 1pt per tap + speed multiplier, max 5 minutes
        const maxTaps = Math.floor(300 / 0.3); // ~1000 taps at fastest humanly possible
        return maxTaps * 2; // with speed multiplier
      }

      case 'PATTERN_SURVIVAL': {
        // round × 20 + perfect bonuses
        const maxRounds = Math.floor(300 / 3); // ~100 rounds in 5min
        return maxRounds * 20 + maxRounds * 10;
      }

      case 'SPEED_TYPE_ANSWER': {
        // 20pts per answer + speed bonus (max 10)
        const maxAnswers = config?.elements ?? 25;
        return maxAnswers * 30; // 20 + max 10 speed bonus
      }

      case 'LOGIC_REFLECTOR': {
        // Beam alignment + time efficiency, generous max
        const rounds = totalRounds || 5;
        return rounds * 100 + 10;
      }

      default:
        // Fallback: generous cap
        return 5000;
    }
  }
}
