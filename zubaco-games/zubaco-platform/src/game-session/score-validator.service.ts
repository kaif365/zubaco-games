import { Injectable } from '@nestjs/common';
import { GameType } from '.prisma/client';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  theoretical_max?: number;
}

/**
 * Server-side score validation.
 * Uses per-game scoring formulas from the spec to compute theoretical maximum scores.
 * Rejects scores that exceed what's physically possible given the config + duration.
 */
@Injectable()
export class ScoreValidatorService {
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

  private computeTheoreticalMax(gameType: GameType, config: Record<string, any>, durationMs: number): number {
    const timeLimit = config?.time_limit ?? 180; // seconds
    const totalRounds = config?.total_rounds ?? config?.elements ?? 10;

    switch (gameType) {
      case 'SLIDING_PUZZLE': {
        // Completed Round: 100pts, Time Bonus: floor(10 × remaining/total)
        const rounds = totalRounds || 5;
        return rounds * 100 + Math.floor(10 * timeLimit / timeLimit); // max time bonus = 10
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
        // (correct/total) × 100 + time bonus
        return 100 + Math.floor(5 * timeLimit / timeLimit); // max = 105 per round
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
