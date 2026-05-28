const fs = require('fs');
const path = require('path');

const all = [
  'flash-spot/flash-spot-backend','colour-sorting/colour-sorting-backend','object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend','true-false-blitz/true-false-blitz-backend','word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend','live-route-builder/live-route-backend','memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend','pattern-survival/pattern-survival-backend','speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend','memory-card-matching/memory-card-matching-backend','sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend','maze-navigation/maze-navigation-backend','Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend','logic-reflector/logic-reflector-backend',
];

const tracingService = `import { Injectable, Logger } from '@nestjs/common';
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
    return \`00-\${span.traceId}-\${span.spanId}-01\`;
  }
}
`;

const tracingMiddleware = `import { Injectable, NestMiddleware } from '@nestjs/common';
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
      \`\${req.method} \${req.path}\`,
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
        res.statusCode >= 500 ? new Error(\`HTTP \${res.statusCode}\`) : undefined,
      );
    });

    next();
  }
}
`;

const tracingModule = `import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { TracingMiddleware } from './tracing.middleware';

@Global()
@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TracingMiddleware).forRoutes('*');
  }
}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const tDir = path.join(dir, 'src/tracing');
  ensureDir(tDir);
  writeIfMissing(path.join(tDir, 'tracing.service.ts'), tracingService);
  writeIfMissing(path.join(tDir, 'tracing.middleware.ts'), tracingMiddleware);
  writeIfMissing(path.join(tDir, 'tracing.module.ts'), tracingModule);

  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');
  if (!appModule.includes('TracingModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].match(/^import /)) { insertIdx = i + 1; break; } }
    lines.splice(insertIdx, 0, "import { TracingModule } from './tracing/tracing.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        TracingModule,');
    fs.writeFileSync(appModulePath, appModule);
  }
  console.log(`OK ${dir}`);
});
console.log('\\nP41 Done!');
