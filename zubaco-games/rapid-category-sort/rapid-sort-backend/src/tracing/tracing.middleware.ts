import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private readonly tracingService: TracingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { traceId, parentSpanId } = this.tracingService.extractFromHeaders(
      req.headers as Record<string, string>,
    );

    const span = this.tracingService.startSpan(
      `${req.method} ${req.path}`,
      traceId,
      parentSpanId,
    );

    // Attach to request for downstream use
    (req as any).span = span;
    (req as any).traceId = span.traceId;

    // Set response headers for trace propagation
    res.setHeader('X-Trace-ID', span.traceId);
    res.setHeader('X-Span-ID', span.spanId);

    // End span on response finish
    res.on('finish', () => {
      span.attributes['http.method'] = req.method;
      span.attributes['http.url'] = req.originalUrl;
      span.attributes['http.status_code'] = res.statusCode;
      span.attributes['http.user_agent'] = req.headers['user-agent'] || '';
      this.tracingService.endSpan(
        span,
        res.statusCode >= 500 ? new Error(`HTTP ${res.statusCode}`) : undefined,
      );
    });

    next();
  }
}
