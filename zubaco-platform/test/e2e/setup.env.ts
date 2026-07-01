/**
 * Environment bootstrap for the HTTP / API / END-TO-END suite (Phase T4-B).
 *
 * Runs BEFORE any module is imported (jest `setupFiles`), so values consumed at
 * import time by `src/config` (JWT secrets, Redis, webhook settings) are already
 * present when the REAL NestJS `AppModule` is booted via `@nestjs/testing`.
 *
 * These E2E specs boot the ENTIRE application and drive it through REAL HTTP
 * (supertest) against the REAL `zubaco_test` PostgreSQL + Redis provisioned by
 * docker-compose.test.yml. Nothing here is a secret; every value is test-only.
 */

// ── Core auth / infra (mirrors the DB-integration setup) ──────────────────────
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.NODE_ENV = 'test';

process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/zubaco_test?schema=public';

// ── Webhook outbox (read once at import by src/config). Zero backoff keeps the
//    background drainer cron from doing real wall-clock waits during the suite. ─
process.env.BASE_PLATFORM_WEBHOOK_URL =
  process.env.BASE_PLATFORM_WEBHOOK_URL || 'https://base-platform.example.test/webhook';
process.env.WEBHOOK_SIGNING_SECRET = process.env.WEBHOOK_SIGNING_SECRET || 'e2e-webhook-signing-secret';
process.env.WEBHOOK_MAX_ATTEMPTS = process.env.WEBHOOK_MAX_ATTEMPTS || '3';
process.env.WEBHOOK_BACKOFF_BASE_SECONDS = '0';
process.env.WEBHOOK_BACKOFF_MAX_SECONDS = '0';
process.env.WEBHOOK_TIMEOUT_MS = '2000';

// ── Service-to-service identity (ServiceIdentityGuard on /admin/control-plane
//    and /anti-cheat). A single test service key lets the suite compute REAL
//    HMAC-SHA256 signatures and exercise the guard exactly as production would.
//    Keep this in sync with SERVICE_IDENTITY_TEST_ID / _KEY in the helper. ─────
process.env.SERVICE_IDENTITY_KEYS =
  process.env.SERVICE_IDENTITY_KEYS ||
  '{"test-suite":{"current":"e2e0000000000000000000000000000000000000000000000000000000000key"}}';

// ── Razorpay: dummy keys so PaymentGatewayService constructs cleanly. Real
//    order creation / signature verification still require the live gateway and
//    are documented as external-provider gaps, not faked. ───────────────────────
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_e2e';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'e2e-razorpay-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'e2e-razorpay-webhook-secret';

// SMS is stubbed via provider override in the harness; leave the API key empty.
process.env.SMS_API_KEY = process.env.SMS_API_KEY || '';
