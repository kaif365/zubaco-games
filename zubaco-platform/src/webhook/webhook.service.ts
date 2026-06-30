import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { config } from '../config';
import {
  GameResultEventData,
  OutboxRecord,
  WebhookEnvelope,
  WebhookEventType,
} from './webhook.types';

/**
 * Durable, signed webhook emitter for validated game results.
 *
 * Design:
 *  - `emitGameResult` builds an HMAC-signed envelope and enqueues it into a
 *    Redis sorted set (`webhook:outbox`) scored by `next_attempt_at` (ms epoch).
 *  - A cron worker drains due records, delivers them over HTTPS, and on failure
 *    reschedules with exponential backoff. After `maxAttempts` the record is
 *    moved to a dead-letter set (`webhook:deadletter`) for manual inspection.
 *  - The client is never trusted: only data already validated server-side is
 *    emitted, and the payload is signed so the Base Platform can verify origin.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly OUTBOX_KEY = 'webhook:outbox';
  private readonly DEADLETTER_KEY = 'webhook:deadletter';
  private processing = false;

  constructor(private readonly redis: RedisService) {}

  /** Enqueue a validated game result for guaranteed (at-least-once) delivery. */
  async emitGameResult(data: GameResultEventData): Promise<void> {
    await this.enqueue('game.result.validated', data);
  }

  /** Signal the wallet/payout layer to prevent or reverse a payout (enforcement). */
  async emitEnforcementReversal(data: { user_id: string; session_id: string; reason: string }): Promise<void> {
    await this.enqueue('enforcement.reversal', data);
  }

  /**
   * Forward an authoritative platform event to the Base Platform. Additive and
   * config-gated (no-op when BASE_PLATFORM_WEBHOOK_URL is unset); reuses the
   * durable signed outbox (retry + DLQ). The envelope id is the platform event
   * id, so redelivery is idempotent (the Base Platform dedupes on it).
   */
  async emitPlatformEvent(
    eventType: string,
    data: unknown,
    userId: string | undefined,
    eventId: string,
  ): Promise<void> {
    await this.enqueue('platform.event', { event_type: eventType, user_id: userId ?? null, data }, eventId);
  }

  private async enqueue(type: WebhookEventType, data: unknown, id?: string): Promise<void> {
    if (!config.webhook.basePlatformUrl) {
      // No destination configured (e.g. local dev). Skip silently.
      this.logger.debug(`Webhook ${type} not emitted: BASE_PLATFORM_WEBHOOK_URL unset`);
      return;
    }

    const envelope: WebhookEnvelope = {
      id: id ?? randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    const record: OutboxRecord = {
      envelope,
      signature: this.sign(JSON.stringify(envelope)),
      attempt: 0,
      next_attempt_at: Date.now(),
    };

    await this.redis.zadd(this.OUTBOX_KEY, record.next_attempt_at, JSON.stringify(record));
  }

  /** HMAC-SHA256 hex signature over the raw JSON body. */
  private sign(body: string): string {
    return crypto
      .createHmac('sha256', config.webhook.signingSecret)
      .update(body)
      .digest('hex');
  }

  /** Drains due outbox records every 10 seconds. */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox(): Promise<void> {
    if (this.processing) return; // prevent overlapping runs
    if (!config.webhook.basePlatformUrl) return;
    this.processing = true;
    try {
      const now = Date.now();
      const due = await this.redis.zrangebyscore(this.OUTBOX_KEY, 0, now, 25);
      for (const raw of due) {
        // Claim the record by removing it; we re-add on retry.
        const removed = await this.redis.zrem(this.OUTBOX_KEY, raw);
        if (removed === 0) continue; // already claimed by another worker
        await this.deliver(raw);
      }
    } catch (err) {
      this.logger.error(`Outbox processing error: ${(err as Error).message}`);
    } finally {
      this.processing = false;
    }
  }

  private async deliver(raw: string): Promise<void> {
    let record: OutboxRecord;
    try {
      record = JSON.parse(raw);
    } catch {
      this.logger.error('Discarding unparseable outbox record');
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.webhook.timeoutMs);
      let res: Response;
      try {
        res = await fetch(config.webhook.basePlatformUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-zubaco-signature': record.signature,
            'x-zubaco-event': record.envelope.type,
            'x-zubaco-event-id': record.envelope.id,
            'x-zubaco-delivery-attempt': String(record.attempt + 1),
          },
          body: JSON.stringify(record.envelope),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.ok) {
        this.logger.log(
          `Webhook ${record.envelope.type} ${record.envelope.id} delivered (attempt ${record.attempt + 1})`,
        );
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      await this.scheduleRetry(record, (err as Error).message);
    }
  }

  private async scheduleRetry(record: OutboxRecord, error: string): Promise<void> {
    const attempt = record.attempt + 1;
    if (attempt >= config.webhook.maxAttempts) {
      record.attempt = attempt;
      record.last_error = error;
      await this.redis.zadd(this.DEADLETTER_KEY, Date.now(), JSON.stringify(record));
      this.logger.error(
        `Webhook ${record.envelope.id} dead-lettered after ${attempt} attempts: ${error}`,
      );
      return;
    }

    const delaySec = Math.min(
      config.webhook.backoffBaseSeconds * Math.pow(2, attempt),
      config.webhook.backoffMaxSeconds,
    );
    record.attempt = attempt;
    record.last_error = error;
    record.next_attempt_at = Date.now() + delaySec * 1000;
    await this.redis.zadd(this.OUTBOX_KEY, record.next_attempt_at, JSON.stringify(record));
    this.logger.warn(
      `Webhook ${record.envelope.id} retry ${attempt} in ${delaySec}s (${error})`,
    );
  }
}
