import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import {
  EVENT_SCHEMA_VERSION,
  EventDeliveryRecord,
  EventSubscriber,
  PlatformEvent,
  PlatformEventType,
} from './event.types';

export const DI_EVENT_SUBSCRIBERS = 'DI_EVENT_SUBSCRIBERS';

/**
 * Single authoritative publish-once / deliver-reliably event bus. Each event is
 * published once (idempotency on event.id) and fanned out to every subscriber
 * via a Redis-backed per-subscriber outbox scored by next-attempt time. A cron
 * drains due records, retries with exponential backoff, and dead-letters after
 * the cap. Subscribers dedupe on event.id, so duplicate delivery is harmless.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly OUTBOX = 'events:outbox';
  private readonly DEADLETTER = 'events:deadletter';
  private readonly DEDUPE = 'events:published';
  private readonly MAX_ATTEMPTS = 8;
  private processing = false;

  constructor(
    private readonly redis: RedisService,
    @Optional() @Inject(DI_EVENT_SUBSCRIBERS) private readonly subscribers: EventSubscriber[] = [],
  ) {}

  /** Publish once, after the authoritative transaction has committed. */
  async publish<T>(type: PlatformEventType, data: T, userId?: string, id?: string): Promise<void> {
    const eventId = id ?? randomUUID();
    const first = await this.redis.setnx(`${this.DEDUPE}:${eventId}`, '1');
    if (!first) return; // duplicate publish suppressed
    await this.redis.expire(`${this.DEDUPE}:${eventId}`, 7 * 24 * 3600);

    const event: PlatformEvent<T> = {
      id: eventId,
      type,
      version: EVENT_SCHEMA_VERSION,
      occurredAt: new Date().toISOString(),
      userId,
      data,
    };

    for (const sub of this.subscribers) {
      const rec: EventDeliveryRecord = { event, subscriber: sub.name, attempt: 0, nextAttemptAt: Date.now() };
      await this.redis.zadd(this.OUTBOX, rec.nextAttemptAt, JSON.stringify(rec));
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async drain(): Promise<void> {
    if (this.processing || this.subscribers.length === 0) return;
    this.processing = true;
    try {
      const due = await this.redis.zrangebyscore(this.OUTBOX, 0, Date.now(), 50);
      for (const raw of due) {
        if ((await this.redis.zrem(this.OUTBOX, raw)) === 0) continue; // claimed elsewhere
        const rec = JSON.parse(raw) as EventDeliveryRecord;
        const sub = this.subscribers.find((s) => s.name === rec.subscriber);
        if (!sub) continue;
        try {
          const ok = await sub.handle(rec.event);
          if (!ok) throw new Error('subscriber returned false');
        } catch (err) {
          rec.attempt += 1;
          if (rec.attempt >= this.MAX_ATTEMPTS) {
            await this.redis.zadd(this.DEADLETTER, Date.now(), JSON.stringify(rec));
            this.logger.error(`Event ${rec.event.type} dead-lettered for ${rec.subscriber}: ${(err as Error).message}`);
          } else {
            rec.nextAttemptAt = Date.now() + Math.min(2 ** rec.attempt, 300) * 1000;
            await this.redis.zadd(this.OUTBOX, rec.nextAttemptAt, JSON.stringify(rec));
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
