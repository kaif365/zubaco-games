import { Injectable, Logger } from '@nestjs/common';
import {
  ScoringMetadata,
  ScoreResult,
  ScoreBreakdownEntry,
  RoundOutcome,
} from './scoring.types';

/**
 * ScoringService — the single source of truth for every game's score.
 *
 * Each game type maps to a deterministic scoring function that consumes only
 * verifiable facts (metadata) plus the server-side config snapshot. The client's
 * claimed score is NEVER used as an input here; it is only compared against the
 * server result downstream for anti-cheat purposes.
 *
 * Formulas for the canonical games come directly from the CURRENT scoring
 * reference; the replacement (ex-MCQ) games use config-driven formulas based on
 * correct/wrong counts and time, matching the same scoring philosophy.
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  /** 0–5 second anti-exploit floor for reaction-time games (per spec). */
  private readonly REACTION_FLOOR_SEC = 5;

  /**
   * Compute the authoritative score for a completed game session.
   *
   * @param gameType  The GameType enum value (string).
   * @param metadata  Verifiable facts reported by the game frontend.
   * @param config    Server-side level/stage config snapshot.
   */
  score(gameType: string, metadata: ScoringMetadata | null | undefined, config: any): ScoreResult {
    const meta: ScoringMetadata = metadata || {};
    const cfg = config || {};

    try {
      const scorer = this.scorers[gameType];
      if (scorer) {
        return scorer(meta, cfg);
      }
      // Unknown game type — fall back to the generic correct/wrong scorer.
      return this.genericScorer(meta, cfg);
    } catch (err) {
      this.logger.warn(`Scoring failed for ${gameType}: ${(err as Error).message}`);
      return this.fallback(cfg);
    }
  }

  // ─── REGISTRY ──────────────────────────────────────────────────

  private readonly scorers: Record<string, (m: ScoringMetadata, c: any) => ScoreResult> = {
    SLIDING_PUZZLE: (m, c) => this.scoreSlidingPuzzle(m, c),
    ARROWS: (m, c) => this.scoreArrows(m, c),
    MAZE_NAVIGATION: (m, c) => this.scoreMaze(m, c),
    FLASH_SPOT: (m, c) => this.scoreSpotDifference(m, c),
    SEQUENCE_RECALL: (m, c) => this.scoreSequenceRecall(m, c),
    MEMORY_CARD_MATCHING: (m, c) => this.scoreMemoryCard(m, c),
    INFINITY_LOOP: (m, c) => this.scoreInfinityLoop(m, c),
    BLOCK_FILL: (m, c) => this.scoreBlockFill(m, c),
    COLOUR_SORTING: (m, c) => this.scoreColourSorting(m, c),
    OBJECT_PLACEMENT_MEMORY: (m, c) => this.scoreObjectPlacement(m, c),
    LIVE_ROUTE_BUILDER: (m, c) => this.scorePathOptimisation(m, c),
    MEMORY_GROUPS: (m, c) => this.scoreConnections(m, c),
    PATTERN_SURVIVAL: (m, c) => this.scoreSurvival(m, c),
    REFLEX_ENDURANCE: (m, c) => this.scoreSurvival(m, c),
    // Ex-MCQ replacement games — config-driven correct/wrong scoring.
    RAPID_CATEGORY_SORT: (m, c) => this.genericScorer(m, c),
    TRUE_FALSE_BLITZ: (m, c) => this.genericScorer(m, c),
    WORD_UNSCRAMBLE: (m, c) => this.genericScorer(m, c),
    NUMBER_GRID_SPRINT: (m, c) => this.genericScorer(m, c),
    LOGIC_REFLECTOR: (m, c) => this.genericScorer(m, c),
    SPEED_TYPE_ANSWER: (m, c) => this.genericScorer(m, c),
  };

  // ─── CANONICAL GAME FORMULAS ───────────────────────────────────

  /**
   * Sliding Puzzle.
   * Round mode: completed round = 100, + floor(10 × remaining / total) time bonus.
   * Reaction mode (tournament): score = window − timeTaken, floored to 0 if ≤ 5s.
   */
  private scoreSlidingPuzzle(m: ScoringMetadata, c: any): ScoreResult {
    if (this.isReaction(m)) return this.reactionScore(m, c, 0);
    if (!m.rounds) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    m.rounds.forEach((r, i) => {
      const pts = r.completed ? 100 : 0;
      score += pts;
      breakdown.push({ label: `Round ${i + 1}`, points: pts });
    });
    const bonus = this.timeBonus(m, 10);
    score += bonus;
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(score, this.maxScore(c, m.rounds.length * 100 + 10), breakdown, true);
  }

  /**
   * Arrows.
   * Per round: full clear = 50, partial = floor(5 × removed / total), empty = 0.
   * + floor(10 × remaining / total) time bonus.
   */
  private scoreArrows(m: ScoringMetadata, c: any): ScoreResult {
    if (!m.rounds) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    m.rounds.forEach((r, i) => {
      let pts: number;
      if (r.completed) pts = 50;
      else if (r.totalArrows && r.arrowsRemoved) pts = Math.floor((5 * r.arrowsRemoved) / r.totalArrows);
      else pts = 0;
      score += pts;
      breakdown.push({ label: `Round ${i + 1}`, points: pts });
    });
    const bonus = this.timeBonus(m, 10);
    score += bonus;
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(score, this.maxScore(c, m.rounds.length * 50 + 10), breakdown, true);
  }

  /**
   * Maze Navigation.
   * Complete + optimal path = 100; complete inefficient = max(10, floor(100 × shortest / moves));
   * incomplete = 0. + floor(5 × remaining / total) time bonus.
   * Tournament variant: win = 50 + (window − timeTaken).
   */
  private scoreMaze(m: ScoringMetadata, c: any): ScoreResult {
    if (this.isReaction(m)) return this.reactionScore(m, c, 50);
    if (!m.rounds) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    m.rounds.forEach((r, i) => {
      let pts = 0;
      if (r.completed) {
        if (r.shortestPath && r.movesTaken && r.movesTaken > r.shortestPath) {
          pts = Math.max(10, Math.floor((100 * r.shortestPath) / r.movesTaken));
        } else {
          pts = 100;
        }
      }
      score += pts;
      breakdown.push({ label: `Round ${i + 1}`, points: pts });
    });
    const bonus = this.timeBonus(m, 5);
    score += bonus;
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(score, this.maxScore(c, m.rounds.length * 100 + 5), breakdown, true);
  }

  /**
   * Spot the Difference (FLASH_SPOT).
   * Per round: max(0, 100 − wrongClicks×5 − hints×5). + floor(10 × remaining / total).
   */
  private scoreSpotDifference(m: ScoringMetadata, c: any): ScoreResult {
    if (!m.rounds) return this.fallback(c);
    const wrongPenalty = Number(c.wrong_click_penalty ?? 5);
    const hintPenalty = Number(c.hint_penalty ?? 5);
    const base = Number(c.base_points ?? 100);
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    m.rounds.forEach((r, i) => {
      const pts = Math.max(0, base - (r.wrongClicks ?? 0) * wrongPenalty - (r.hints ?? 0) * hintPenalty);
      score += pts;
      breakdown.push({ label: `Round ${i + 1}`, points: pts });
    });
    const bonus = this.timeBonus(m, 10);
    score += bonus;
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(score, this.maxScore(c, m.rounds.length * base + 10), breakdown, true);
  }

  /**
   * Sequence Recall.
   * correctClicks × scorePerClick(10), + floor(secondsLeft × ratio 1.0) ONLY if no wrong moves.
   * Tournament variant: sequenceLength × 20.
   */
  private scoreSequenceRecall(m: ScoringMetadata, c: any): ScoreResult {
    const breakdown: ScoreBreakdownEntry[] = [];
    if (m.correctClicks === undefined && m.sequenceLength === undefined) return this.fallback(c);

    if (c.tournament_mode && m.sequenceLength !== undefined) {
      const score = m.sequenceLength * 20;
      breakdown.push({ label: 'Sequence length × 20', points: score });
      return this.result(score, this.maxScore(c, score), breakdown, true);
    }

    const perClick = Number(c.score_per_click ?? 10);
    const ratio = Number(c.bonus_time_ratio ?? 1.0);
    const base = (m.correctClicks ?? 0) * perClick;
    breakdown.push({ label: 'Correct clicks', points: base });
    let bonus = 0;
    if (!m.hadWrong && m.timeRemaining) {
      bonus = Math.floor(m.timeRemaining * ratio);
    }
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(base + bonus, this.maxScore(c, base + bonus), breakdown, true);
  }

  /**
   * Memory Card Matching.
   * completedLevels × 100, + remaining whole seconds ONLY if all levels completed.
   * Tournament variant: win = 50 + (window − timeTaken).
   */
  private scoreMemoryCard(m: ScoringMetadata, c: any): ScoreResult {
    if (this.isReaction(m)) return this.reactionScore(m, c, 50);
    if (m.completedLevels === undefined) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    const base = m.completedLevels * 100;
    breakdown.push({ label: 'Completed levels × 100', points: base });
    const bonus = m.allCompleted ? Math.floor(m.timeRemaining ?? 0) : 0;
    breakdown.push({ label: 'Time bonus', points: bonus });
    return this.result(base + bonus, this.maxScore(c, base + bonus), breakdown, true);
  }

  /**
   * Infinity Loop.
   * Per solved board: 10 + remaining seconds on that board. Sum of all boards.
   */
  private scoreInfinityLoop(m: ScoringMetadata, c: any): ScoreResult {
    const boards = m.boards ?? m.rounds;
    if (!boards) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    boards.forEach((b, i) => {
      const pts = b.completed ? 10 + Math.floor(b.timeRemaining ?? 0) : 0;
      score += pts;
      breakdown.push({ label: `Board ${i + 1}`, points: pts });
    });
    return this.result(score, this.maxScore(c, score), breakdown, true);
  }

  /**
   * Block Fill.
   * Per board: easy 20, medium 30, hard 40, fallback 20, demo 0.
   * + remaining seconds end bonus. Tournament variant: window − timeTaken.
   */
  private scoreBlockFill(m: ScoringMetadata, c: any): ScoreResult {
    if (this.isReaction(m)) return this.reactionScore(m, c, 0);
    const boards = m.boards ?? m.rounds;
    if (!boards) return this.fallback(c);
    const table: Record<string, number> = { easy: 20, medium: 30, hard: 40, demo: 0 };
    const breakdown: ScoreBreakdownEntry[] = [];
    let score = 0;
    boards.forEach((b, i) => {
      if (!b.completed) {
        breakdown.push({ label: `Board ${i + 1}`, points: 0 });
        return;
      }
      const key = (b.difficulty ?? '').toLowerCase();
      const pts = key in table ? table[key] : 20;
      score += pts;
      breakdown.push({ label: `Board ${i + 1} (${key || 'fallback'})`, points: pts });
    });
    const bonus = Math.floor(m.timeRemaining ?? 0);
    score += bonus;
    breakdown.push({ label: 'End bonus', points: bonus });
    return this.result(score, this.maxScore(c, score), breakdown, true);
  }

  /**
   * Colour-Based Sorting.
   * Base 60 on completion + efficiency bonus (≤25) + speed bonus (≤10). Cap 100.
   */
  private scoreColourSorting(m: ScoringMetadata, c: any): ScoreResult {
    if (m.completed === undefined) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    if (!m.completed) {
      breakdown.push({ label: 'Incomplete', points: 0 });
      return this.result(0, 100, breakdown, true);
    }
    let score = 60;
    breakdown.push({ label: 'Base (completion)', points: 60 });
    // Efficiency bonus: up to 25 based on fewer moves relative to optimal.
    let eff = 0;
    if (m.optimalMoves && m.movesTaken && m.movesTaken > 0) {
      eff = Math.round(Math.max(0, Math.min(1, m.optimalMoves / m.movesTaken)) * 25);
    } else if (m.optimalMoves) {
      eff = 25;
    }
    score += eff;
    breakdown.push({ label: 'Efficiency bonus', points: eff });
    // Speed bonus: up to 10 based on remaining time fraction.
    let speed = 0;
    if (m.timeRemaining !== undefined && m.timeTotal) {
      speed = Math.round(Math.max(0, Math.min(1, m.timeRemaining / m.timeTotal)) * 10);
    }
    score += speed;
    breakdown.push({ label: 'Speed bonus', points: speed });
    return this.result(Math.min(100, score), 100, breakdown, true);
  }

  /**
   * Object Placement Memory.
   * 1 correct placement = 20 points; total = 20 × correctPlacements (cap n×m).
   */
  private scoreObjectPlacement(m: ScoringMetadata, c: any): ScoreResult {
    if (m.correctPlacements === undefined) return this.fallback(c);
    const perPlacement = Number(c.points_per_placement ?? 20);
    const score = m.correctPlacements * perPlacement;
    const cells = Number(c.grid_cells ?? c.elements ?? 0);
    const max = cells > 0 ? cells * perPlacement : this.maxScore(c, score);
    return this.result(score, max, [{ label: 'Correct placements × 20', points: score }], true);
  }

  /**
   * Path Optimisation (LIVE_ROUTE_BUILDER).
   * Win = 100 + efficiency bonus (optimalCost / playerCost up to a cap).
   */
  private scorePathOptimisation(m: ScoringMetadata, c: any): ScoreResult {
    if (m.completed === undefined) return this.fallback(c);
    const breakdown: ScoreBreakdownEntry[] = [];
    if (!m.completed) {
      breakdown.push({ label: 'Incomplete', points: 0 });
      return this.result(0, 150, breakdown, true);
    }
    let score = 100;
    breakdown.push({ label: 'Base (all nodes visited)', points: 100 });
    let eff = 0;
    if (m.optimalMoves && m.movesTaken && m.movesTaken > 0) {
      eff = Math.round(Math.max(0, Math.min(1, m.optimalMoves / m.movesTaken)) * 50);
    }
    score += eff;
    breakdown.push({ label: 'Efficiency bonus', points: eff });
    return this.result(score, this.maxScore(c, 150), breakdown, true);
  }

  /**
   * Connections (MEMORY_GROUPS).
   * 5–10 pts per correct group + streak bonus. No hard cap (time-bounded).
   */
  private scoreConnections(m: ScoringMetadata, c: any): ScoreResult {
    if (m.groupsFound === undefined) return this.fallback(c);
    const perGroup = Number(c.points_per_group ?? 10);
    const breakdown: ScoreBreakdownEntry[] = [];
    const base = m.groupsFound * perGroup;
    breakdown.push({ label: 'Groups found', points: base });
    const streakBonus = (m.bestStreak ?? 0) > 1 ? (m.bestStreak as number) * 2 : 0;
    breakdown.push({ label: 'Streak bonus', points: streakBonus });
    return this.result(base + streakBonus, this.maxScore(c, base + streakBonus), breakdown, true);
  }

  /**
   * Survival / endurance games (PATTERN_SURVIVAL, REFLEX_ENDURANCE).
   * levelsCleared × pointsPerLevel, or correct − wrong fallback.
   */
  private scoreSurvival(m: ScoringMetadata, c: any): ScoreResult {
    if (m.levelsCleared !== undefined) {
      const per = Number(c.points_per_level ?? 10);
      const score = m.levelsCleared * per;
      return this.result(score, this.maxScore(c, score), [{ label: 'Levels cleared', points: score }], true);
    }
    return this.genericScorer(m, c);
  }

  // ─── GENERIC (EX-MCQ REPLACEMENT) SCORER ───────────────────────

  /**
   * Config-driven correct/wrong scorer for games without a bespoke formula.
   * score = clamp(correct × pointsPerCorrect − wrong × penalty + timeBonus, 0, max).
   */
  private genericScorer(m: ScoringMetadata, c: any): ScoreResult {
    const correct = Number(m.correct ?? 0);
    const wrong = Number(m.wrong ?? 0);
    const hasFacts = m.correct !== undefined || m.wrong !== undefined || m.rounds !== undefined;
    if (!hasFacts) return this.fallback(c);

    const perCorrect = Number(c.points_per_correct ?? 10);
    const penalty = Number(c.wrong_penalty ?? 0);
    const breakdown: ScoreBreakdownEntry[] = [];
    const base = correct * perCorrect;
    const deduction = wrong * penalty;
    breakdown.push({ label: 'Correct', points: base });
    if (deduction) breakdown.push({ label: 'Penalty', points: -deduction });
    const bonus = this.timeBonus(m, Number(c.time_bonus_factor ?? 0));
    if (bonus) breakdown.push({ label: 'Time bonus', points: bonus });
    const score = Math.max(0, base - deduction + bonus);
    return this.result(score, this.maxScore(c, base + bonus), breakdown, true);
  }

  // ─── REACTION-TIME HELPER ──────────────────────────────────────

  /** True when the metadata describes a single reaction-time attempt. */
  private isReaction(m: ScoringMetadata): boolean {
    return m.windowSec !== undefined && m.timeTakenSec !== undefined && !m.rounds;
  }

  /**
   * Reaction-time score: base (on win) + (window − timeTaken).
   * Anti-exploit: if solved in ≤ 5 seconds, the reaction component is 0.
   */
  private reactionScore(m: ScoringMetadata, c: any, winBase: number): ScoreResult {
    const breakdown: ScoreBreakdownEntry[] = [];
    if (!m.completed) {
      breakdown.push({ label: 'Did not finish', points: 0 });
      return this.result(0, this.maxScore(c, winBase + Number(m.windowSec ?? 0)), breakdown, true);
    }
    const window = Number(m.windowSec ?? 0);
    const taken = Number(m.timeTakenSec ?? window);
    let reaction = 0;
    if (taken > this.REACTION_FLOOR_SEC) {
      reaction = Math.max(0, Math.round(window - taken));
    }
    if (winBase) breakdown.push({ label: 'Win base', points: winBase });
    breakdown.push({ label: 'Reaction (window − time)', points: reaction });
    return this.result(winBase + reaction, this.maxScore(c, winBase + window), breakdown, true);
  }

  // ─── SHARED HELPERS ────────────────────────────────────────────

  /** floor(factor × remaining / total) whole-game time bonus. */
  private timeBonus(m: ScoringMetadata, factor: number): number {
    if (!factor || m.timeRemaining === undefined || !m.timeTotal) return 0;
    return Math.floor((factor * m.timeRemaining) / m.timeTotal);
  }

  private maxScore(c: any, derived: number): number {
    const configured = Number(c?.max_score ?? 0);
    return configured > 0 ? configured : Math.max(derived, 1);
  }

  private result(score: number, maxScore: number, breakdown: ScoreBreakdownEntry[], validated: boolean): ScoreResult {
    return { score: Math.max(0, Math.round(score)), maxScore, breakdown, validated };
  }

  /** Used when metadata is missing — score 0 and mark unvalidated for review. */
  private fallback(c: any): ScoreResult {
    return {
      score: 0,
      maxScore: this.maxScore(c, 100),
      breakdown: [{ label: 'No verifiable metadata — flagged for review', points: 0 }],
      validated: false,
    };
  }
}
