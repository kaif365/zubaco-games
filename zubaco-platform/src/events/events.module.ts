import { Global, Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { EventBusService, DI_EVENT_SUBSCRIBERS } from './event-bus.service';
import { InAppEventSubscriber } from './subscribers/in-app.subscriber';

/**
 * Centralized event pipeline. Authoritative services publish through
 * EventBusService; subscribers fan out to channels (in-app now, webhook +
 * email/SMS/push as future adapters). Global so any module can publish without
 * direct service-to-service notification calls.
 */
@Global()
@Module({
  imports: [NotificationModule],
  providers: [
    InAppEventSubscriber,
    {
      provide: DI_EVENT_SUBSCRIBERS,
      useFactory: (inApp: InAppEventSubscriber) => [inApp],
      inject: [InAppEventSubscriber],
    },
    EventBusService,
  ],
  exports: [EventBusService],
})
export class EventsModule {}
