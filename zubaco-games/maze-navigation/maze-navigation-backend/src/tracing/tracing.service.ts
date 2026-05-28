import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  createTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }

  createSpanId(): string {
    return randomUUID().replace(/-/g, '').substring(0, 16);
  }

  startSpan(operationName: string, traceId?: string, parentSpanId?: string): Span {
    return {
      traceId: traceId || this.createTraceId(),
      spanId: this.createSpanId(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: 'OK',
      attributes: {},
    };
  }

  endSpan(span: Span, error?: Error): Span {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    if (error) {
      span.status = 'ERROR';
      span.attributes['error.message'] = error.message;
      span.attributes['error.type'] = error.constructor.name;
    }
    this.logger.debug({
      msg: 'span_completed',
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operation: span.operationName,
      duration: span.duration,
      status: span.status,
    });
    return span;
  }

  /**
   * Extract trace context from incoming headers (W3C Trace Context format)
   */
  extractFromHeaders(headers: Record<string, string>): { traceId: string; parentSpanId?: string } {
    const traceparent = headers['traceparent'];
    if (traceparent) {
      // Format: version-traceId-parentId-flags
      const parts = traceparent.split('-');
      if (parts.length === 4) {
        return { traceId: parts[1], parentSpanId: parts[2] };
      }
    }
    // Fallback to X-Correlation-ID
    const correlationId = headers['x-correlation-id'];
    return { traceId: correlationId || this.createTraceId() };
  }

  /**
   * Create traceparent header for outgoing requests (W3C Trace Context)
   */
  createTraceparentHeader(span: Span): string {
    return `00-${span.traceId}-${span.spanId}-01`;
  }
}
