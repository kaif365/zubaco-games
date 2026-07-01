import * as crypto from 'crypto';
import Redis from 'ioredis';
import { WebhookService } from '../../src/webhook/webhook.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { config } from '../../src/config';
import { adminClient, assertRedisReachable } from './redis-test-util';

const OUTBOX = 'webhook:outbox';
const DEADLETTER = 'webhook:deadletter';

/**
 * INTEGRATION — WebhookService durable outbox against a REAL Redis server.
 *
 * The only stubbed boundary is the outbound HTTPS call (`global.fetch`) to the
 * external Base Platform — everything else (HMAC signing, Redis enqueue, drain,
 * exponential-backoff retry, dead-lettering) runs for real. Backoff is 0s in the
 * test env so the retry -> DLQ progression is deterministic.
 */
describe('INTEGRATION Webhook outbox (real Redis)', () => {
  let redis: RedisService;
  let admin: Redis;
  let service: WebhookService;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    admin = adminClient();
    await assertRedisReachable(admin);
    redis = new RedisService();
    service = new WebhookService(redis);
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await redis.onModuleDestroy();
    await admin.quit();
  });

  beforeEach(async () => {
    await admin.flushdb();
  });

  const readOutbox = async (): Promise<any[]> =>
    (await admin.zrange(OUTBOX, 0, -1)).map((r) => JSON.parse(r));

  const gameResult = () =>
    ({
      session_id: 'sess-1',
      user_id: 'user-1',
      game_type: 'SLIDING_PUZZLE',
      score: 1200,
      validated: true,
    }) as any;

  it('enqueues a validated result with a correct HMAC-SHA256 signature', async () => {
    await service.emitGameResult(gameResult());

    const [record] = await readOutbox();
    expect(record).toBeDefined();
    expect(record.attempt).toBe(0);

    const expected = crypto
      .createHmac('sha256', config.webhook.signingSecret)
      .update(JSON.stringify(record.envelope))
      .digest('hex');
    expect(record.signature).toBe(expected); // signature verifiable by the receiver
    expect(record.envelope.type).toBe('game.result.validated');
  });

  it('is a no-op when no destination URL is configured (config-gated)', async () => {
    const original = config.webhook.basePlatformUrl;
    (config.webhook as any).basePlatformUrl = '';
    try {
      await service.emitGameResult(gameResult());
      expect(await admin.zcard(OUTBOX)).toBe(0); // nothing enqueued
    } finally {
      (config.webhook as any).basePlatformUrl = original;
    }
  });

  it('delivers a due record and removes it from the outbox on HTTP 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;

    await service.emitGameResult(gameResult());
    await service.processOutbox();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(await admin.zcard(OUTBOX)).toBe(0); // delivered
    expect(await admin.zcard(DEADLETTER)).toBe(0);
  });

  it('reschedules with a recorded attempt when delivery fails (retry)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    await service.emitGameResult(gameResult());
    await service.processOutbox();

    const records = await readOutbox();
    expect(records).toHaveLength(1);
    expect(records[0].attempt).toBe(1);
    expect(records[0].last_error).toContain('500');
    expect(await admin.zcard(DEADLETTER)).toBe(0);
  });

  it('dead-letters a record after the max-attempts cap is exceeded', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any;

    await service.emitGameResult(gameResult());
    // maxAttempts = 3 in the test env: three drains -> DLQ on the third.
    await service.processOutbox();
    await service.processOutbox();
    await service.processOutbox();

    expect(await admin.zcard(OUTBOX)).toBe(0);
    expect(await admin.zcard(DEADLETTER)).toBe(1);
    const [dead] = (await admin.zrange(DEADLETTER, 0, -1)).map((r) => JSON.parse(r));
    expect(dead.attempt).toBe(3);
    expect(dead.last_error).toContain('503');
  });
});
