import { Global, Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { EventBusService, DI_EVENT_SUBSCRIBERS } from './event-bus.service';
import { InAppEventSubscriber } from './subscribers/in-app.subscriber';
import { WebhookEventSubscriber } from './subscribers/webhook.subscriber';

/**
 * Centralized event pipeline. Authoritative services publish through
 * EventBusService; subscribers fan out to channels (in-app + webhook now,
 * email/SMS as future adapters). Global so any module can publish without
 * direct service-to-service notification calls. WebhookService is provided by
 * the @Global WebhookModule, so no import is required here.
 */
@Global()
@Module({
  imports: [NotificationModule],
  providers: [
    InAppEventSubscriber,
    WebhookEventSubscriber,
    {
      provide: DI_EVENT_SUBSCRIBERS,
      useFactory: (inApp: InAppEventSubscriber, webhook: WebhookEventSubscriber) => [inApp, webhook],
      inject: [InAppEventSubscriber, WebhookEventSubscriber],
    },
    EventBusService,
  ],
  exports: [EventBusService],
})
export class EventsModule {}
