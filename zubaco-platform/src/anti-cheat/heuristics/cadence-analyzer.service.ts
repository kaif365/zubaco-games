import { Injectable } from '@nestjs/common';
import { CheatFlagType, CheatSeverity, GameType } from '.prisma/client';

export interface InputEvent {
  t: number;
  x?: number;
  y?: number;
  type?: string;
}

export interface BiomechanicsAnalysisResult {
  isCheat: boolean;
  flagType?: CheatFlagType;
  severity?: CheatSeverity;
  reason?: string;
  metrics: {
    totalInputs: number;
    minIntervalMs: number | null;
    avgIntervalMs: number | null;
    stdDevMs: number | null;
    sub50msCount: number;
    sub100msCount: number;
    identicalCoordsStreak: number;
  };
}

/**
 * Biomechanics & Cadence Heuristics Engine (Module 7.2).
 *
 * Mathematically evaluates human neuromuscular reaction limits, spatial coordinate jitter,
 * and statistical variance to identify bots, scripts, and synthetic event injection.
 */
@Injectable()
export class CadenceAnalyzerService {
  /** Hard physiological neuromuscular tap floor (milliseconds). */
  readonly SUB_HUMAN_FLOOR_MS = 50;

  /** Fast human reaction threshold (milliseconds). */
  readonly FAST_HUMAN_THRESHOLD_MS = 100;

  /** Minimum standard deviation for human motor variability (milliseconds). */
  readonly ROBOTIC_STD_DEV_THRESHOLD_MS = 5;

  /** Minimum consecutive pixel-identical clicks to flag synthetic touch automation. */
  readonly SYNTHETIC_COORDINATES_STREAK = 5;

  analyze(rawEvents: any, gameType?: GameType): BiomechanicsAnalysisResult {
    const defaultMetrics = {
      totalInputs: 0,
      minIntervalMs: null,
      avgIntervalMs: null,
      stdDevMs: null,
      sub50msCount: 0,
      sub100msCount: 0,
      identicalCoordsStreak: 0,
    };

    if (!rawEvents) {
      return { isCheat: false, metrics: defaultMetrics };
    }

    const eventsList = Array.isArray(rawEvents)
      ? rawEvents
      : rawEvents.events || rawEvents.input_log || rawEvents.move_log || [];

    if (!Array.isArray(eventsList) || eventsList.length < 4) {
      return { isCheat: false, metrics: { ...defaultMetrics, totalInputs: eventsList.length || 0 } };
    }

    // Extract normalized timestamps and coordinates
    const normalized: InputEvent[] = eventsList
      .map((item: any) => {
        if (typeof item === 'number') return { t: item };
        if (typeof item?.t === 'number') return { t: item.t, x: item.x, y: item.y, type: item.type };
        return null;
      })
      .filter((e): e is InputEvent => e !== null);

    if (normalized.length < 4) {
      return { isCheat: false, metrics: { ...defaultMetrics, totalInputs: normalized.length } };
    }

    const intervals: number[] = [];
    let identicalStreak = 0;
    let maxIdenticalStreak = 0;

    for (let i = 1; i < normalized.length; i++) {
      const dt = normalized[i].t - normalized[i - 1].t;
      if (dt >= 0) intervals.push(dt);

      // Coordinate identicality check (synthetic injection without finger touch jitter)
      if (
        normalized[i].x !== undefined &&
        normalized[i].y !== undefined &&
        normalized[i - 1].x !== undefined &&
        normalized[i - 1].y !== undefined
      ) {
        if (normalized[i].x === normalized[i - 1].x && normalized[i].y === normalized[i - 1].y) {
          identicalStreak++;
          if (identicalStreak > maxIdenticalStreak) maxIdenticalStreak = identicalStreak;
        } else {
          identicalStreak = 0;
        }
      }
    }

    if (intervals.length === 0) {
      return { isCheat: false, metrics: { ...defaultMetrics, totalInputs: normalized.length } };
    }

    const minInterval = Math.min(...intervals);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((acc, dt) => acc + Math.pow(dt - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    const sub50Count = intervals.filter((dt) => dt < this.SUB_HUMAN_FLOOR_MS).length;
    const sub100Count = intervals.filter((dt) => dt < this.FAST_HUMAN_THRESHOLD_MS).length;

    const metrics = {
      totalInputs: normalized.length,
      minIntervalMs: minInterval,
      avgIntervalMs: Math.round(avgInterval * 100) / 100,
      stdDevMs: Math.round(stdDev * 100) / 100,
      sub50msCount: sub50Count,
      sub100msCount: sub100Count,
      identicalCoordsStreak: maxIdenticalStreak + 1, // Number of identical clicks in streak
    };

    // 1. Sub-human neuromuscular / reaction limits (<50ms floor, <100ms fast human reaction)
    if (sub50Count >= 6 || sub100Count >= 6) {
      return {
        isCheat: true,
        flagType: 'INPUT_BOT_PATTERN',
        severity: 'CRITICAL',
        reason:
          sub50Count >= 6
            ? `Sub-50ms superhuman neuromuscular tap cadence: ${sub50Count} taps < 50ms`
            : `Sub-100ms superhuman input cadence: ${sub100Count} taps < 100ms`,
        metrics,
      };
    }

    if (sub50Count >= 3 || sub100Count >= 3) {
      return {
        isCheat: true,
        flagType: 'INPUT_BOT_PATTERN',
        severity: 'HIGH',
        reason:
          sub50Count >= 3
            ? `Sub-50ms superhuman neuromuscular tap cadence: ${sub50Count} taps < 50ms`
            : `Sub-100ms superhuman input cadence: ${sub100Count} taps < 100ms`,
        metrics,
      };
    }

    // 2. Robotic Zero-Variance Regularity Check (StdDev < 5ms over >= 8 inputs)
    if (intervals.length >= 8 && stdDev < this.ROBOTIC_STD_DEV_THRESHOLD_MS) {
      return {
        isCheat: true,
        flagType: 'INPUT_BOT_PATTERN',
        severity: 'HIGH',
        reason: `Robotic clockwork cadence: std dev of ${metrics.stdDevMs}ms over ${intervals.length} intervals`,
        metrics,
      };
    }

    // 3. Exact Pixel Coordinate Clamping (Synthetic Auto-Clicker)
    if (metrics.identicalCoordsStreak >= this.SYNTHETIC_COORDINATES_STREAK) {
      return {
        isCheat: true,
        flagType: 'INPUT_BOT_PATTERN',
        severity: 'HIGH',
        reason: `Synthetic click coordinate injection: ${metrics.identicalCoordsStreak} consecutive clicks on identical pixel`,
        metrics,
      };
    }

    return {
      isCheat: false,
      metrics,
    };
  }
}
