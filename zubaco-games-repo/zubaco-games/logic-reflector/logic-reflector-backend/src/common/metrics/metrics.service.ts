import { Injectable } from '@nestjs/common';

interface CounterMetric {
  name: string;
  help: string;
  labels: Record<string, number>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramMetric {
  name: string;
  help: string;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, CounterMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private readonly startTime = Date.now();

  incrementCounter(name: string, help: string, labels: Record<string, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    const key = `${name}`;
    if (!this.counters.has(key)) {
      this.counters.set(key, { name, help, labels: {} });
    }
    const counter = this.counters.get(key)!;
    counter.labels[labelKey] = (counter.labels[labelKey] || 0) + 1;
  }

  observeHistogram(name: string, help: string, value: number): void {
    const defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        buckets: defaultBuckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      });
    }
    const hist = this.histograms.get(name)!;
    hist.sum += value;
    hist.count += 1;
    for (const bucket of hist.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  serialize(): string {
    const lines: string[] = [];

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSeconds}`);
    lines.push('');

    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);
    lines.push('');

    lines.push('# HELP process_heap_used_bytes Heap used in bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
    lines.push('');

    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const [labelKey, value] of Object.entries(counter.labels)) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${counter.name}${labelStr} ${value}`);
      }
      lines.push('');
    }

    for (const hist of this.histograms.values()) {
      lines.push(`# HELP ${hist.name} ${hist.help}`);
      lines.push(`# TYPE ${hist.name} histogram`);
      for (const bucket of hist.buckets) {
        lines.push(`${hist.name}_bucket{le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`${hist.name}_bucket{le="+Inf"} ${hist.count}`);
      lines.push(`${hist.name}_sum ${hist.sum}`);
      lines.push(`${hist.name}_count ${hist.count}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}
