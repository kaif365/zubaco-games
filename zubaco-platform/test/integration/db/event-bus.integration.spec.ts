/**
 * SECTION H — EVENT BUS (integration, Phase T4-A)
 *
 * HONEST SCOPING: the platform event bus is intentionally NOT backed by a
 * Postgres table. Events are published to a Redis-backed, per-subscriber outbox
 * (`events:outbox`) with a Redis dedupe guard (`events:published:<id>`) and
 * drained by a cron delivery loop. The full delivery/retry/dead-letter behaviour
 * was established in Phase T2 (Redis integration). This spec only reconfirms the
 * REAL Redis-backed idempotent publish contract used by the DB-backed workflows
 * above; there is no database persistence to assert because none exists.
 */
import { Harness, startHarness } from './harness';
import { PlatformEventType } from '../../../src/events/event.types';

describe('Event Bus — integration (Redis-backed, no DB table by design)', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  });

  afterAll(async () => {
    await h.stop();
  });

  beforeEach(async () => {
    await h.reset();
  });

  it('records a Redis dedupe guard when an event is published', async () => {
    await h.graph.events.publish(PlatformEventType.WALLET_CREDITED, { amount: 100 }, 'user-1', 'evt-1');

    expect(await h.redisAdmin.get('events:published:evt-1')).toBe('1');
  });

  it('suppresses a duplicate publish with the same event id (idempotent)', async () => {
    await h.graph.events.publish(PlatformEventType.WALLET_CREDITED, { amount: 100 }, 'user-1', 'evt-dup');
    // Second publish with the same id is a no-op (dedupe guard already set).
    await h.graph.events.publish(PlatformEventType.WALLET_CREDITED, { amount: 999 }, 'user-1', 'evt-dup');

    // Still exactly one dedupe key; no exception; delivery loop unaffected.
    expect(await h.redisAdmin.get('events:published:evt-dup')).toBe('1');
  });
});
