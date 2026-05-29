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

const auditInterceptor = `import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const REDACTED_HEADERS = ['authorization', 'x-api-key', 'cookie', 'x-signature'];
const REDACTED_BODY_FIELDS = ['password', 'token', 'secret', 'creditCard', 'ssn'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const { method, url, ip, headers, body } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.log({
            type: 'AUDIT',
            method,
            url,
            statusCode: response.statusCode,
            duration,
            ip,
            userId: request.user?.sub || request.user?.id || 'anonymous',
            correlationId: headers['x-correlation-id'] || 'none',
            userAgent: headers['user-agent'],
            headers: this.redactHeaders(headers),
            body: this.redactBody(body),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.warn({
            type: 'AUDIT_ERROR',
            method,
            url,
            statusCode: error.status || 500,
            duration,
            ip,
            userId: request.user?.sub || request.user?.id || 'anonymous',
            correlationId: headers['x-correlation-id'] || 'none',
            error: error.message,
          });
        },
      }),
    );
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      redacted[key] = REDACTED_HEADERS.includes(key.toLowerCase()) ? '[REDACTED]' : String(value);
    }
    return redacted;
  }

  private redactBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const redacted = { ...(body as Record<string, unknown>) };
    for (const field of REDACTED_BODY_FIELDS) {
      if (field in redacted) redacted[field] = '[REDACTED]';
    }
    return redacted;
  }
}
`;

const auditModule = `import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditModule {}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const auditDir = path.join(dir, 'src/audit');
  ensureDir(auditDir);
  writeIfMissing(path.join(auditDir, 'audit.interceptor.ts'), auditInterceptor);
  writeIfMissing(path.join(auditDir, 'audit.module.ts'), auditModule);

  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');
  if (!appModule.includes('AuditModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].match(/^import /)) { insertIdx = i + 1; break; } }
    lines.splice(insertIdx, 0, "import { AuditModule } from './audit/audit.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        AuditModule,');
    fs.writeFileSync(appModulePath, appModule);
  }
  console.log(`OK ${dir}`);
});
console.log('\\nP36 Done!');
