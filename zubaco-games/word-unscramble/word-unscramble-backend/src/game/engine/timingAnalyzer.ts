export interface TimingConfig {
  minAvgResponseMs: number;
  minSingleResponseMs: number;
  maxSuspiciousPct: number;
}

export interface TimingResult {
  avgResponseMs: number;
  minResponseMs: number;
  maxResponseMs: number;
  suspiciousCount: number;
  totalInputs: number;
  isSuspicious: boolean;
  reason: string | null;
}

const DEFAULT_CONFIG: TimingConfig = {
  minAvgResponseMs: 150,
  minSingleResponseMs: 50,
  maxSuspiciousPct: 0.6,
};

export function analyzeInputTiming(
  timestamps: number[],
  config: Partial<TimingConfig> = {},
): TimingResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (timestamps.length < 2) {
    return { avgResponseMs: 0, minResponseMs: 0, maxResponseMs: 0, suspiciousCount: 0, totalInputs: timestamps.length, isSuspicious: false, reason: null };
  }

  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(Math.abs(timestamps[i]! - timestamps[i - 1]!));
  }

  const avgResponseMs = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const minResponseMs = Math.min(...gaps);
  const maxResponseMs = Math.max(...gaps);
  const suspiciousCount = gaps.filter((g) => g < cfg.minSingleResponseMs).length;
  const suspiciousPct = suspiciousCount / gaps.length;

  let isSuspicious = false;
  let reason: string | null = null;

  if (avgResponseMs < cfg.minAvgResponseMs) {
    isSuspicious = true;
    reason = `Average response time ${Math.round(avgResponseMs)}ms below threshold ${cfg.minAvgResponseMs}ms`;
  } else if (suspiciousPct > cfg.maxSuspiciousPct) {
    isSuspicious = true;
    reason = `${Math.round(suspiciousPct * 100)}% of inputs below ${cfg.minSingleResponseMs}ms threshold`;
  }

  return { avgResponseMs, minResponseMs, maxResponseMs, suspiciousCount, totalInputs: timestamps.length, isSuspicious, reason };
}
