import { GameType } from '.prisma/client';

/**
 * Input timing signature collected by game backends during gameplay.
 * Sent alongside score submission for bot pattern analysis.
 */
export interface InputSignature {
  intervals: number[];       // ms between consecutive inputs
  totalInputs: number;
  firstInputAt: number;      // ms after game start of first input
  lastInputAt: number;       // ms after game start of last input
  avgInterval: number;
  stdDevInterval: number;
  minInterval: number;
  maxInterval: number;
}

export interface BotDetectionResult {
  isBot: boolean;
  confidence: number;        // 0.0 - 1.0
  reasons: string[];
  severity: 'HIGH' | 'CRITICAL';
}

/**
 * Per-game minimum acceptable average interval (ms).
 * Reaction-heavy games allow faster inputs; puzzle games require thinking time.
 */
const MIN_AVG_INTERVAL: Partial<Record<GameType, number>> = {
  REFLEX_ENDURANCE: 50,
  FLASH_SPOT: 80,
  SPEED_TYPE_ANSWER: 40,
  RAPID_CATEGORY_SORT: 120,
  TRUE_FALSE_BLITZ: 150,
  ARROWS: 150,
  SLIDING_PUZZLE: 200,
  BLOCK_FILL: 200,
  COLOUR_SORTING: 180,
  MAZE_NAVIGATION: 100,
  MEMORY_CARD_MATCHING: 200,
  SEQUENCE_RECALL: 150,
  WORD_UNSCRAMBLE: 120,
  NUMBER_GRID_SPRINT: 100,
  OBJECT_PLACEMENT_MEMORY: 200,
  PATTERN_SURVIVAL: 100,
  LOGIC_REFLECTOR: 200,
  INFINITY_LOOP: 150,
  LIVE_ROUTE_BUILDER: 150,
  MEMORY_GROUPS: 180,
};

/**
 * Analyzes input timing signature to detect bot/automation patterns.
 *
 * Heuristics:
 * 1. Constant interval — stdDev < 15ms (humans have 50-200ms variance)
 * 2. Superhuman speed — avgInterval below game-specific minimum
 * 3. Zero reaction time — firstInputAt < 200ms (instant play = pre-scripted)
 * 4. Metronomic pattern — Coefficient of Variation (CV) < 0.1
 * 5. Input burst — >10 inputs within 100ms window (autoclicker)
 */
export function detectBotPattern(signature: InputSignature, gameType: GameType): BotDetectionResult {
  const reasons: string[] = [];
  let confidence = 0;

  // Need at least 10 inputs for reliable analysis
  if (signature.totalInputs < 10 || signature.intervals.length < 5) {
    return { isBot: false, confidence: 0, reasons: [], severity: 'HIGH' };
  }

  // 1. Constant interval (machine-like precision)
  if (signature.stdDevInterval < 15 && signature.avgInterval > 0) {
    reasons.push(`Constant interval: stdDev=${signature.stdDevInterval.toFixed(1)}ms (threshold: 15ms)`);
    confidence += 0.35;
  }

  // 2. Superhuman speed
  const minAvg = MIN_AVG_INTERVAL[gameType] || 150;
  if (signature.avgInterval < minAvg) {
    reasons.push(`Superhuman speed: avg=${signature.avgInterval.toFixed(1)}ms (min for ${gameType}: ${minAvg}ms)`);
    confidence += 0.3;
  }

  // 3. Zero reaction time (started playing before human could read the screen)
  if (signature.firstInputAt < 200) {
    reasons.push(`Zero reaction: firstInput=${signature.firstInputAt}ms (threshold: 200ms)`);
    confidence += 0.2;
  }

  // 4. Metronomic pattern — Coefficient of Variation < 0.1
  if (signature.avgInterval > 0) {
    const cv = signature.stdDevInterval / signature.avgInterval;
    if (cv < 0.1 && signature.totalInputs >= 15) {
      reasons.push(`Metronomic: CV=${cv.toFixed(3)} (threshold: 0.1)`);
      confidence += 0.3;
    }
  }

  // 5. Input burst — detect >10 inputs within any 100ms window
  let maxBurst = 0;
  const intervals = signature.intervals;
  for (let i = 0; i < intervals.length; i++) {
    let windowSum = 0;
    let count = 0;
    for (let j = i; j < intervals.length && windowSum <= 100; j++) {
      windowSum += intervals[j];
      count++;
    }
    maxBurst = Math.max(maxBurst, count);
  }
  if (maxBurst > 10) {
    reasons.push(`Input burst: ${maxBurst} inputs within 100ms window`);
    confidence += 0.25;
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  const isBot = confidence >= 0.5;
  const severity: 'HIGH' | 'CRITICAL' = confidence >= 0.7 ? 'CRITICAL' : 'HIGH';

  return { isBot, confidence, reasons, severity };
}

/**
 * Compare current session's input pattern to historical patterns.
 * Detects sudden transition from human-like to bot-like inputs.
 */
export function detectPatternShift(
  currentSignature: InputSignature,
  historicalSignatures: InputSignature[],
): { shifted: boolean; details: string } {
  if (historicalSignatures.length < 3) {
    return { shifted: false, details: 'Insufficient history' };
  }

  // Calculate average historical CV (Coefficient of Variation)
  const historicalCVs = historicalSignatures
    .filter((s) => s.avgInterval > 0)
    .map((s) => s.stdDevInterval / s.avgInterval);

  if (historicalCVs.length < 3) {
    return { shifted: false, details: 'Insufficient valid history' };
  }

  const avgHistoricalCV = historicalCVs.reduce((a, b) => a + b, 0) / historicalCVs.length;
  const currentCV = currentSignature.avgInterval > 0
    ? currentSignature.stdDevInterval / currentSignature.avgInterval
    : 0;

  // If user historically had high variance (human) but now has very low (bot-like)
  if (avgHistoricalCV > 0.25 && currentCV < 0.08) {
    return {
      shifted: true,
      details: `Pattern shift: historical CV=${avgHistoricalCV.toFixed(3)}, current CV=${currentCV.toFixed(3)}`,
    };
  }

  return { shifted: false, details: '' };
}
