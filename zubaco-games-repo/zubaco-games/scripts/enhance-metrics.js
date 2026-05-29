const fs = require('fs');
const path = require('path');

const backends = [
  'flash-spot/flash-spot-backend',
  'colour-sorting/colour-sorting-backend',
  'object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend',
  'true-false-blitz/true-false-blitz-backend',
  'word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend',
  'live-route-builder/live-route-backend',
  'memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend',
  'pattern-survival/pattern-survival-backend',
  'speed-type-answer/speed-type-backend',
];

const metricsServiceContent = `import { Injectable } from '@nestjs/common';

/**
 * Production-grade Prometheus metrics collector.
 * Outputs text/plain Prometheus exposition format.
 * Tracks: HTTP requests, latency, game sessions, scores, errors, and system health.
 */

interface CounterMetric {
  name: string;
  help: string;
  labels: Record<string, number>;
}

interface GaugeMetric {
  name: string;
  help: string;
  labels: Record<string, number>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramEntry {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

interface HistogramMetric {
  name: string;
  help: string;
  entries: Record<string, HistogramEntry>;
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, CounterMetric>();
  private gauges = new Map<string, GaugeMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private readonly startTime = Date.now();

  // ── Counters ───────────────────────────────────────────────────────────────

  incrementCounter(name: string, help: string, labels: Record<string, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, labels: {} });
    }
    const counter = this.counters.get(name)!;
    counter.labels[labelKey] = (counter.labels[labelKey] || 0) + 1;
  }

  // ── Gauges ─────────────────────────────────────────────────────────────────

  setGauge(name: string, help: string, value: number, labels: Record<string, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, labels: {} });
    }
    this.gauges.get(name)!.labels[labelKey] = value;
  }

  incrementGauge(name: string, help: string, labels: Record<string, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, labels: {} });
    }
    const gauge = this.gauges.get(name)!;
    gauge.labels[labelKey] = (gauge.labels[labelKey] || 0) + 1;
  }

  decrementGauge(name: string, help: string, labels: Record<string, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, labels: {} });
    }
    const gauge = this.gauges.get(name)!;
    gauge.labels[labelKey] = (gauge.labels[labelKey] || 0) - 1;
  }

  // ── Histograms ─────────────────────────────────────────────────────────────

  observeHistogram(
    name: string,
    help: string,
    value: number,
    labels: Record<string, string> = {},
    customBuckets?: number[],
  ): void {
    const labelKey = this.serializeLabels(labels);
    const defaultBuckets = customBuckets || [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    if (!this.histograms.has(name)) {
      this.histograms.set(name, { name, help, entries: {} });
    }
    const hist = this.histograms.get(name)!;
    if (!hist.entries[labelKey]) {
      hist.entries[labelKey] = {
        buckets: defaultBuckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      };
    }
    const entry = hist.entries[labelKey];
    entry.sum += value;
    entry.count += 1;
    for (const bucket of entry.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  // ── Game-specific convenience methods ──────────────────────────────────────

  /** Track a new game session starting */
  trackSessionStart(stageId: string): void {
    this.incrementCounter('game_sessions_started_total', 'Total game sessions started', { stage: stageId });
    this.incrementGauge('game_sessions_active', 'Currently active game sessions', { stage: stageId });
  }

  /** Track a game session ending */
  trackSessionEnd(stageId: string, status: string): void {
    this.decrementGauge('game_sessions_active', 'Currently active game sessions', { stage: stageId });
    this.incrementCounter('game_sessions_completed_total', 'Total game sessions completed', { stage: stageId, status });
  }

  /** Track a game score submission */
  trackScore(stageId: string, score: number): void {
    this.observeHistogram(
      'game_score_points',
      'Distribution of game scores',
      score,
      { stage: stageId },
      [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
    );
  }

  /** Track cheat detection */
  trackCheatFlag(severity: string): void {
    this.incrementCounter('game_cheat_flags_total', 'Total cheat flags raised', { severity });
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  serialize(): string {
    const lines: string[] = [];

    // Process metrics
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(\`process_uptime_seconds \${uptimeSeconds}\`);
    lines.push('');

    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(\`process_resident_memory_bytes \${mem.rss}\`);
    lines.push('');

    lines.push('# HELP process_heap_used_bytes Heap used in bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(\`process_heap_used_bytes \${mem.heapUsed}\`);
    lines.push('');

    lines.push('# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds');
    lines.push('# TYPE nodejs_eventloop_lag_seconds gauge');
    lines.push(\`nodejs_eventloop_lag_seconds 0\`);
    lines.push('');

    // Counters
    for (const counter of this.counters.values()) {
      lines.push(\`# HELP \${counter.name} \${counter.help}\`);
      lines.push(\`# TYPE \${counter.name} counter\`);
      for (const [labelKey, value] of Object.entries(counter.labels)) {
        const labelStr = labelKey ? \`{\${labelKey}}\` : '';
        lines.push(\`\${counter.name}\${labelStr} \${value}\`);
      }
      lines.push('');
    }

    // Gauges
    for (const gauge of this.gauges.values()) {
      lines.push(\`# HELP \${gauge.name} \${gauge.help}\`);
      lines.push(\`# TYPE \${gauge.name} gauge\`);
      for (const [labelKey, value] of Object.entries(gauge.labels)) {
        const labelStr = labelKey ? \`{\${labelKey}}\` : '';
        lines.push(\`\${gauge.name}\${labelStr} \${value}\`);
      }
      lines.push('');
    }

    // Histograms
    for (const hist of this.histograms.values()) {
      lines.push(\`# HELP \${hist.name} \${hist.help}\`);
      lines.push(\`# TYPE \${hist.name} histogram\`);
      for (const [labelKey, entry] of Object.entries(hist.entries)) {
        const labelPrefix = labelKey ? \`\${labelKey},\` : '';
        for (const bucket of entry.buckets) {
          lines.push(\`\${hist.name}_bucket{\${labelPrefix}le="\${bucket.le}"} \${bucket.count}\`);
        }
        lines.push(\`\${hist.name}_bucket{\${labelPrefix}le="+Inf"} \${entry.count}\`);
        lines.push(\`\${hist.name}_sum{\${labelKey ? labelKey : ''}} \${entry.sum}\`);
        lines.push(\`\${hist.name}_count{\${labelKey ? labelKey : ''}} \${entry.count}\`);
      }
      lines.push('');
    }

    return lines.join('\\n');
  }

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([k, v]) => \`\${k}="\${v}"\`)
      .join(',');
  }
}
`;

backends.forEach((dir) => {
  const filePath = path.join(dir, 'src/common/metrics/metrics.service.ts');
  fs.writeFileSync(filePath, metricsServiceContent);
  console.log(`UPDATED ${filePath}`);
});
