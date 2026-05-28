/**
 * OpenTelemetry auto-instrumentation bootstrap.
 * Must be the very first import in main.ts so SDK patches libraries before they are loaded.
 *
 * Exporters:
 *  - OTLP (grpc/http) when OTEL_EXPORTER_OTLP_ENDPOINT is set in .env
 *  - Console only otherwise (local dev / no infra)
 */
import os from "os";
import util from "util";

import { config } from "@common/config/env.config";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import type { ExportResult } from "@opentelemetry/core";
import { ExportResultCode, hrTimeToMicroseconds } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ConsoleLogRecordExporter,
  type LogRecordExporter,
  type ReadableLogRecord,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  type AggregationTemporality,
  ConsoleMetricExporter,
  type InstrumentType,
  type PushMetricExporter,
  type ResourceMetrics,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ConsoleSpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { PrismaInstrumentation } from "@prisma/instrumentation";

// Keep console-exported telemetry plain-text so log collectors like Grafana do not receive ANSI escapes.
/**
 * Render a value without ANSI colors for log shipping compatibility.
 *
 * @param {unknown} value - value to serialize.
 * @param {number | null} depth - inspection depth.
 *
 * @returns {string} The string result.
 */
const inspectPlain = (value: unknown, depth: number | null = 3): string =>
  util.inspect(value, {
    colors: false,
    depth,
    compact: false,
    breakLength: Infinity,
    sorted: false,
  });

/**
 * Write a plain-text line to stdout.
 *
 * @param {unknown} value - value to serialize.
 * @param {number | null} depth - inspection depth.
 *
 * @returns {void} The void result.
 */
const writePlain = (value: unknown, depth: number | null = 3): void => {
  process.stdout.write(`${inspectPlain(value, depth)}\n`);
};

/**
 * Export spans to stdout without terminal color codes.
 */
class PlainConsoleSpanExporter implements SpanExporter {
  /**
   * Export spans.
   *
   * @param {ReadableSpan[]} spans - spans to export.
   * @param {(result: ExportResult) => void} resultCallback - completion callback.
   *
   * @returns {void} The void result.
   */
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    for (const span of spans) {
      writePlain(
        {
          resource: {
            attributes: span.resource.attributes,
          },
          instrumentationScope: span.instrumentationScope,
          traceId: span.spanContext().traceId,
          parentSpanContext: span.parentSpanContext,
          traceState: span.spanContext().traceState?.serialize(),
          name: span.name,
          id: span.spanContext().spanId,
          kind: span.kind,
          timestamp: hrTimeToMicroseconds(span.startTime),
          duration: hrTimeToMicroseconds(span.duration),
          attributes: span.attributes,
          status: span.status,
          events: span.events,
          links: span.links,
        },
        3,
      );
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  /**
   * Force flush exporter state.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Shutdown the exporter.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  shutdown(): Promise<void> {
    return this.forceFlush();
  }
}

/**
 * Export log records to stdout without terminal color codes.
 */
class PlainConsoleLogRecordExporter implements LogRecordExporter {
  /**
   * Export log records.
   *
   * @param {ReadableLogRecord[]} logs - logs to export.
   * @param {(result: ExportResult) => void} resultCallback - completion callback.
   *
   * @returns {void} The void result.
   */
  export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    for (const logRecord of logs) {
      writePlain(
        {
          resource: {
            attributes: logRecord.resource.attributes,
          },
          instrumentationScope: logRecord.instrumentationScope,
          timestamp: hrTimeToMicroseconds(logRecord.hrTime),
          traceId: logRecord.spanContext?.traceId,
          spanId: logRecord.spanContext?.spanId,
          traceFlags: logRecord.spanContext?.traceFlags,
          severityText: logRecord.severityText,
          severityNumber: logRecord.severityNumber,
          eventName: logRecord.eventName,
          body: logRecord.body,
          attributes: logRecord.attributes,
        },
        3,
      );
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  /**
   * Force flush exporter state.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Shutdown the exporter.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Export metrics to stdout without terminal color codes.
 */
class PlainConsoleMetricExporter implements PushMetricExporter {
  /**
   * Export resource metrics.
   *
   * @param {ResourceMetrics} metrics - metrics to export.
   * @param {(result: ExportResult) => void} resultCallback - completion callback.
   *
   * @returns {void} The void result.
   */
  export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void,
  ): void {
    for (const scopeMetrics of metrics.scopeMetrics) {
      for (const metric of scopeMetrics.metrics) {
        writePlain(
          {
            descriptor: metric.descriptor,
            dataPointType: metric.dataPointType,
            dataPoints: metric.dataPoints,
          },
          null,
        );
      }
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  /**
   * Force flush exporter state.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Select metric temporality.
   *
   * @param {InstrumentType} instrumentType - instrument type value.
   *
   * @returns {AggregationTemporality} The aggregation temporality result.
   */
  selectAggregationTemporality(
    instrumentType: InstrumentType,
  ): AggregationTemporality {
    return new ConsoleMetricExporter().selectAggregationTemporality(
      instrumentType,
    );
  }

  /**
   * Shutdown the exporter.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

// Enable OTel internal diagnostics at WARN level during startup.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const { enabled, serviceName, exporterEndpoint: endpoint } = config.otel;

const plainTextLogs = !config.logging.colorEnabled;

/**
 * Create the configured span exporter.
 *
 * @returns {SpanExporter} The span exporter result.
 */
const makeSpanExporter = (): SpanExporter => {
  if (endpoint) {
    return new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  }

  return plainTextLogs
    ? new PlainConsoleSpanExporter()
    : new ConsoleSpanExporter();
};

/**
 * Create the configured log exporter.
 *
 * @returns {LogRecordExporter} The log exporter result.
 */
const makeLogExporter = (): LogRecordExporter => {
  if (endpoint) {
    return new OTLPLogExporter({ url: `${endpoint}/v1/logs` });
  }

  return plainTextLogs
    ? new PlainConsoleLogRecordExporter()
    : new ConsoleLogRecordExporter();
};

/**
 * Create the configured metric exporter.
 *
 * @returns {PushMetricExporter} The metric exporter result.
 */
const makeMetricExporter = (): PushMetricExporter => {
  if (endpoint) {
    return new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });
  }

  return plainTextLogs
    ? new PlainConsoleMetricExporter()
    : new ConsoleMetricExporter();
};

if (enabled) {
  const traceExporter = makeSpanExporter();
  const logExporter = makeLogExporter();
  const metricReader = new PeriodicExportingMetricReader({
    exporter: makeMetricExporter(),
  });

  const sdk = new NodeSDK({
    serviceName,
    traceExporter,
    spanProcessors: [new SimpleSpanProcessor(traceExporter)],
    logRecordProcessors: [new SimpleLogRecordProcessor(logExporter)],
    metricReader,
    instrumentations: [
      new HttpInstrumentation(),
      new IORedisInstrumentation(),
      new PrismaInstrumentation(),
    ],
    resource: resourceFromAttributes({ "host.name": os.hostname() }),
  });

  sdk.start();

  process.on("SIGTERM", () => {
    void sdk.shutdown().finally(() => process.exit(0));
  });
}
