import { Injectable } from '@nestjs/common';

export interface MetricLabels {
  [key: string]: string | number;
}

interface CounterMetric {
  help: string;
  type: 'counter';
  values: Map<string, number>;
}

interface GaugeMetric {
  help: string;
  type: 'gauge';
  values: Map<string, number>;
}

interface HistogramMetric {
  help: string;
  type: 'histogram';
  buckets: number[];
  counts: Map<string, Map<number, number>>; // labelKey -> bucket -> count
  sums: Map<string, number>;
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, CounterMetric>();
  private gauges = new Map<string, GaugeMetric>();
  private histograms = new Map<string, HistogramMetric>();

  constructor() {
    this.registerDefaultMetrics();
  }

  private registerDefaultMetrics() {
    this.registerCounter('http_requests_total', 'Total number of HTTP requests processed');
    this.registerGauge('active_websocket_connections', 'Current active WebSocket client connections');
    this.registerCounter('tournament_stage_transitions_total', 'Total tournament stage transitions triggered');
    this.registerCounter('wallet_transactions_total', 'Total wallet financial transactions executed');
    this.registerCounter('anti_cheat_flags_total', 'Total anti-cheat flags raised by detection engine');
    this.registerHistogram(
      'http_request_duration_seconds',
      'HTTP request latency in seconds',
      [0.01, 0.05, 0.1, 0.15, 0.3, 0.5, 1, 2.5, 5],
    );
  }

  private formatLabels(labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) return '';
    const parts = Object.entries(labels)
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
      .sort();
    return `{${parts.join(',')}}`;
  }

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { help, type: 'counter', values: new Map() });
    }
  }

  incrementCounter(name: string, labels?: MetricLabels, value = 1): void {
    let metric = this.counters.get(name);
    if (!metric) {
      this.registerCounter(name, name);
      metric = this.counters.get(name)!;
    }
    const labelKey = this.formatLabels(labels);
    const current = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, current + value);
  }

  registerGauge(name: string, help: string): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { help, type: 'gauge', values: new Map() });
    }
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    let metric = this.gauges.get(name);
    if (!metric) {
      this.registerGauge(name, name);
      metric = this.gauges.get(name)!;
    }
    const labelKey = this.formatLabels(labels);
    metric.values.set(labelKey, value);
  }

  registerHistogram(name: string, help: string, buckets: number[] = [0.05, 0.1, 0.25, 0.5, 1, 2.5]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        help,
        type: 'histogram',
        buckets: buckets.sort((a, b) => a - b),
        counts: new Map(),
        sums: new Map(),
      });
    }
  }

  observeHistogram(name: string, value: number, labels?: MetricLabels): void {
    let metric = this.histograms.get(name);
    if (!metric) {
      this.registerHistogram(name, name);
      metric = this.histograms.get(name)!;
    }

    const labelKey = this.formatLabels(labels);
    let bucketCounts = metric.counts.get(labelKey);
    if (!bucketCounts) {
      bucketCounts = new Map<number, number>();
      for (const b of metric.buckets) bucketCounts.set(b, 0);
      metric.counts.set(labelKey, bucketCounts);
    }

    for (const b of metric.buckets) {
      if (value <= b) {
        bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);
      }
    }

    const currentSum = metric.sums.get(labelKey) || 0;
    metric.sums.set(labelKey, currentSum + value);
  }

  /**
   * Serializes all recorded metrics into standard Prometheus Exposition format.
   */
  async getMetrics(): Promise<string> {
    const lines: string[] = [];

    // Counters
    for (const [name, metric] of this.counters) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} counter`);
      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      } else {
        for (const [labels, val] of metric.values) {
          lines.push(`${name}${labels} ${val}`);
        }
      }
    }

    // Gauges
    for (const [name, metric] of this.gauges) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} gauge`);
      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      } else {
        for (const [labels, val] of metric.values) {
          lines.push(`${name}${labels} ${val}`);
        }
      }
    }

    // Histograms
    for (const [name, metric] of this.histograms) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [labels, bucketMap] of metric.counts) {
        const baseLabels = labels ? labels.slice(1, -1) : '';
        for (const [le, count] of bucketMap) {
          const l = baseLabels ? `{${baseLabels},le="${le}"}` : `{le="${le}"}`;
          lines.push(`${name}_bucket${l} ${count}`);
        }
        const infLabels = baseLabels ? `{${baseLabels},le="+Inf"}` : '{le="+Inf"}';
        const totalCount = metric.sums.get(labels) ? bucketMap.get(metric.buckets[metric.buckets.length - 1]) || 0 : 0;
        lines.push(`${name}_bucket${infLabels} ${totalCount}`);
        lines.push(`${name}_sum${labels} ${metric.sums.get(labels) || 0}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}

