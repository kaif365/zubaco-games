import Redis from 'ioredis';
import { EventBusService } from '../../src/events/event-bus.service';
import { RedisService } from '../../src/common/redis/redis.service';
import {
  EventSubscriber,
  PlatformEvent,
  PlatformEventType,
} from '../../src/events/event.types';
import { adminClient, assertRedisReachable } from './redis-test-util';

const OUTBOX = 'events:outbox';
const DEADLETTER = 'events:deadletter';

/** A real subscriber implementation that records deliveries (stands in for a
 *  delivery channel). Optionally fails to exercise retry / dead-letter paths. */
class RecordingSubscriber implements EventSubscriber {
  readonly received: PlatformEvent[] = [];
  constructor(readonly name: string, private readonly ok = true) {}
  async handle(event: PlatformEvent): Promise<boolean> {
    this.received.push(event);
    if (!this.ok) throw new Error('subscriber failure (test)');
    return true;
  }
}

/**
 * INTEGRATION — EventBusService against a REAL Redis server.
 *
 * Verifies the authoritative publish-once / deliver-reliably contract with real
 * component interaction: publish idempotency (replay protection via SETNX),
 * per-subscriber outbox fanout, drain delivery, retry scheduling with backoff,
 * and dead-lettering after the attempt cap.
 */
describe('INTEGRATION EventBus (real Redis)', () => {
  let redis: RedisService;
  let admin: Redis;

  beforeAll(async () => {
    admin = adminClient();
    await assertRedisReachable(admin);
    redis = new RedisService();
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
    await admin.quit();
  });

  beforeEach(async () => {
    await admin.flushdb();
  });

  const readOutbox = async (): Promise<any[]> =>
    (await admin.zrange(OUTBOX, 0, -1)).map((r) => JSON.parse(r));

  it('fans a single published event out to every subscriber exactly once', async () => {
    const bus = new EventBusService(redis, [
      new RecordingSubscriber('in-app'),
      new RecordingSubscriber('webhook'),
    ]);

    await bus.publish(PlatformEventType.WALLET_CREDITED, { amount: 100 }, 'user-1', 'evt-1');

    expect(await admin.zcard(OUTBOX)).toBe(2); // one record per subscriber
    expect(await admin.get('events:published:evt-1')).toBe('1'); // dedupe marker set
  });

  it('suppresses a duplicate publish of the same event id (replay protection)', async () => {
    const bus = new EventBusService(redis, [new RecordingSubscriber('in-app')]);

    await bus.publish(PlatformEventType.REWARD_ELIGIBLE, { prize: 500 }, 'user-1', 'evt-dup');
    await bus.publish(PlatformEventType.REWARD_ELIGIBLE, { prize: 500 }, 'user-1', 'evt-dup');

    expect(await admin.zcard(OUTBOX)).toBe(1); // second publish added nothing
  });

  it('drains the outbox and delivers the event to the subscriber', async () => {
    const sub = new RecordingSubscriber('in-app');
    const bus = new EventBusService(redis, [sub]);

    await bus.publish(PlatformEventType.TOURNAMENT_PROGRESSED, { stage: 2 }, 'user-1', 'evt-drain');
    await bus.drain();

    expect(sub.received).toHaveLength(1);
    expect(sub.received[0].id).toBe('evt-drain');
    expect(sub.received[0].data).toEqual({ stage: 2 });
    expect(await admin.zcard(OUTBOX)).toBe(0); // acknowledged
    expect(await admin.zcard(DEADLETTER)).toBe(0);
  });

  it('reschedules a failed delivery for retry (not dead-lettered yet)', async () => {
    const sub = new RecordingSubscriber('in-app', false); // fails
    const bus = new EventBusService(redis, [sub]);

    await bus.publish(PlatformEventType.ANTI_CHEAT_ENFORCED, { reason: 'x' }, 'user-1', 'evt-fail');
    await bus.drain();

    const records = await readOutbox();
    expect(records).toHaveLength(1);
    expect(records[0].attempt).toBe(1); // one failed attempt recorded
    expect(records[0].nextAttemptAt).toBeGreaterThan(Date.now()); // backoff scheduled
    expect(await admin.zcard(DEADLETTER)).toBe(0);
  });

  it('dead-letters a delivery once the attempt cap is reached', async () => {
    const sub = new RecordingSubscriber('in-app', false); // always fails
    const bus = new EventBusService(redis, [sub]);

    // Seed a near-exhausted delivery record (attempt 7; cap is 8) that is due now.
    const event: PlatformEvent = {
      id: 'evt-dlq',
      type: PlatformEventType.PAYOUT_SETTLED,
      version: 1,
      occurredAt: new Date().toISOString(),
      userId: 'user-1',
      data: { amount: 10 },
    };
    await admin.zadd(
      OUTBOX,
      0,
      JSON.stringify({ event, subscriber: 'in-app', attempt: 7, nextAttemptAt: 0 }),
    );

    await bus.drain();

    expect(await admin.zcard(OUTBOX)).toBe(0);
    expect(await admin.zcard(DEADLETTER)).toBe(1); // moved to DLQ
    const dead = JSON.parse((await admin.zrange(DEADLETTER, 0, -1))[0]);
    expect(dead.attempt).toBe(8);
    expect(dead.event.id).toBe('evt-dlq');
  });
});
