/**
 * Phase T4-B — REAL application boot harness for HTTP / API / END-TO-END tests.
 *
 * This is the heart of the E2E suite: it starts the ENTIRE production NestJS
 * `AppModule` exactly as `main.ts` would (same global prefix, same global
 * `ValidationPipe`, same helmet hardening) and exposes the live HTTP server for
 * supertest. Requests therefore traverse the FULL production stack — routing,
 * guards (JWT + ServiceIdentity + GeoFencing), pipes, DTO validation,
 * interceptors, controllers and the real service graph — against the REAL
 * `zubaco_test` PostgreSQL + Redis.
 *
 * Only ONE seam is replaced: {@link SmsService}. SMS is an external provider, so
 * it is overridden with an in-memory capture stub that records the OTP messages
 * the app would have sent. This lets the auth flow be driven end-to-end over
 * HTTP (send OTP → read code from the capture → verify) without a real SMS
 * gateway. Every other provider (Prisma, Redis, JWT, guards, business services)
 * is the genuine production implementation.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import Redis from 'ioredis';
import { AppModule } from '../../src/app.module';
import { SmsService } from '../../src/auth/sms.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { getPrisma, disconnectPrisma, resetDb } from '../integration/db/prisma-test-util';
import { redisConnectOptions } from '../integration/redis-test-util';

/** Records every SMS the app tried to send so tests can recover OTP codes. */
export class SmsCaptureStub {
  readonly messages: Array<{ phone: string; message: string }> = [];

  // Mirrors the real SmsService.send signature.
  async send(phone: string, message: string): Promise<boolean> {
    this.messages.push({ phone, message });
    return true;
  }

  /** The most recent numeric OTP sent to `phone` (parsed from the SMS body). */
  lastOtp(phone: string): string | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].phone === phone) {
        const m = this.messages[i].message.match(/(\d{4,8})/);
        if (m) return m[1];
      }
    }
    return undefined;
  }

  clear(): void {
    this.messages.length = 0;
  }
}

export interface E2EApp {
  /** The booted, initialised Nest application (real AppModule). */
  app: INestApplication;
  /** The underlying HTTP server handle to pass to `supertest`. */
  http: import('http').Server;
  /** Captured outbound SMS (OTP recovery for the real auth flow). */
  sms: SmsCaptureStub;
  /** Admin Prisma (same test DB) for fixtures + TRUNCATE-based reset. */
  prisma: PrismaService;
  /** Direct Redis connection for flushing state + inspecting keys. */
  redisAdmin: Redis;
  /** Empty the DB and flush Redis + clear captured SMS for a clean slate. */
  reset: () => Promise<void>;
  /** Tear everything down (call from afterAll) to avoid open-handle leaks. */
  close: () => Promise<void>;
}

/**
 * Boot the real application for E2E testing. Applies the SAME global
 * configuration as `src/main.ts` so the HTTP surface behaves identically to
 * production (routes under `/api/v1`, whitelist validation, helmet headers).
 */
export async function bootE2EApp(): Promise<E2EApp> {
  const sms = new SmsCaptureStub();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    // ONLY external provider replaced — everything else is the real graph.
    .overrideProvider(SmsService)
    .useValue(sms)
    .compile();

  const app = moduleRef.createNestApplication({ bufferLogs: false });

  // ── Replicate main.ts bootstrap exactly ──────────────────────────────────
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  const prisma = await getPrisma();
  const redisAdmin = new Redis({ ...redisConnectOptions, maxRetriesPerRequest: 3 });

  // Fail fast with a clear message if the backing infra isn't up.
  const pong = await redisAdmin.ping();
  if (pong !== 'PONG') {
    throw new Error(`Redis not reachable at ${redisConnectOptions.host}:${redisConnectOptions.port}`);
  }
  await prisma.$queryRawUnsafe('SELECT 1');

  return {
    app,
    http: app.getHttpServer(),
    sms,
    prisma,
    redisAdmin,
    reset: async () => {
      await resetDb(prisma);
      await redisAdmin.flushdb();
      sms.clear();
    },
    close: async () => {
      await app.close();
      await disconnectPrisma();
      redisAdmin.disconnect();
    },
  };
}
