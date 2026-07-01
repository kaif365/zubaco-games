/**
 * Environment bootstrap for the integration suite. Runs BEFORE any module is
 * imported (jest `setupFiles`), so values consumed at import time by
 * `src/config` (JWT secrets, Redis host/port, webhook settings) are in place.
 *
 * All values are test-only and non-secret. The webhook backoff is set to 0 so
 * retry -> dead-letter transitions can be driven deterministically without
 * waiting on real wall-clock backoff.
 */
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.NODE_ENV = 'test';

process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Point DB-backed integration tests at the SEPARATE test database provisioned
// by docker-compose.test.yml (never the production/dev DB). Current Redis-based
// suites do not open a Prisma connection, so this is inert for them.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/zubaco_test?schema=public';

// Webhook outbox config (read once at import by src/config).
process.env.BASE_PLATFORM_WEBHOOK_URL = 'https://base-platform.example.test/webhook';
process.env.WEBHOOK_SIGNING_SECRET = 'integration-webhook-signing-secret';
process.env.WEBHOOK_MAX_ATTEMPTS = '3';
process.env.WEBHOOK_BACKOFF_BASE_SECONDS = '0';
process.env.WEBHOOK_BACKOFF_MAX_SECONDS = '0';
process.env.WEBHOOK_TIMEOUT_MS = '2000';
