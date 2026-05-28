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

// ─── Request Size Limiter ───
const requestSizeGuard = `import { Injectable, NestMiddleware, PayloadTooLargeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || '1048576', 10); // 1MB default

@Injectable()
export class RequestSizeLimiterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_SIZE) {
      throw new PayloadTooLargeException(
        \`Request body exceeds maximum size of \${MAX_BODY_SIZE} bytes\`,
      );
    }
    next();
  }
}
`;

// ─── IP Rate Limiter (more granular than @nestjs/throttler) ───
const ipRateLimiter = `import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class IpRateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpRateLimiterMiddleware.name);
  private readonly store = new Map<string, RateEntry>();
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = parseInt(process.env.IP_RATE_LIMIT || '200', 10);

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      this.setHeaders(res, 1);
      return next();
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      this.logger.warn(\`Rate limit exceeded for IP: \${ip}\`);
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.setHeaders(res, entry.count);
    next();
  }

  private setHeaders(res: Response, count: number): void {
    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - count).toString());
  }
}
`;

// ─── Production Hardening Module ───
const hardeningModule = `import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestSizeLimiterMiddleware } from './request-size-limiter.middleware';
import { IpRateLimiterMiddleware } from './ip-rate-limiter.middleware';

@Module({})
export class HardeningModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestSizeLimiterMiddleware, IpRateLimiterMiddleware)
      .forRoutes('*');
  }
}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const hDir = path.join(dir, 'src/hardening');
  ensureDir(hDir);
  writeIfMissing(path.join(hDir, 'request-size-limiter.middleware.ts'), requestSizeGuard);
  writeIfMissing(path.join(hDir, 'ip-rate-limiter.middleware.ts'), ipRateLimiter);
  writeIfMissing(path.join(hDir, 'hardening.module.ts'), hardeningModule);

  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');
  if (!appModule.includes('HardeningModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].match(/^import /)) { insertIdx = i + 1; break; } }
    lines.splice(insertIdx, 0, "import { HardeningModule } from './hardening/hardening.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        HardeningModule,');
    fs.writeFileSync(appModulePath, appModule);
  }
  console.log(`OK ${dir}`);
});
console.log('\\nP44 Done!');
