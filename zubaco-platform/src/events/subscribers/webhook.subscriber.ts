import { Injectable } from '@nestjs/common';
import { WebhookService } from '../../webhook/webhook.service';
import { EventSubscriber, PlatformEvent } from '../event.types';

/**
 * Webhook delivery adapter. Forwards every authoritative platform event to the
 * Base Platform through the existing durable, HMAC-signed webhook outbox (with
 * retry + dead-letter). Config-gated: a no-op when BASE_PLATFORM_WEBHOOK_URL is
 * unset, so it changes no behaviour in environments without a configured
 * destination. Idempotent — the webhook envelope id is the platform event id,
 * so the Base Platform dedupes on redelivery.
 */
@Injectable()
export class WebhookEventSubscriber implements EventSubscriber {
  readonly name = 'webhook';
  constructor(private readonly webhook: WebhookService) {}

  async handle(event: PlatformEvent): Promise<boolean> {
    await this.webhook.emitPlatformEvent(event.type, event.data, event.userId, event.id);
    return true;
  }
}
