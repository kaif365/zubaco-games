import { Injectable } from '@nestjs/common';
import { NotificationType } from '.prisma/client';
import { NotificationService } from '../../notification/notification.service';
import { EventSubscriber, PlatformEvent, PlatformEventType } from '../event.types';

const TITLES: Partial<Record<PlatformEventType, { type: NotificationType; title: string }>> = {
  [PlatformEventType.TOURNAMENT_PROGRESSED]: { type: 'STAGE_OPEN', title: 'Next stage open' },
  [PlatformEventType.TOURNAMENT_COMPLETED]: { type: 'SYSTEM', title: 'Tournament complete' },
  [PlatformEventType.REWARD_ELIGIBLE]: { type: 'PRIZE_WON', title: 'You won a prize' },
  [PlatformEventType.WALLET_CREDITED]: { type: 'PRIZE_WON', title: 'Wallet credited' },
  [PlatformEventType.PAYOUT_SETTLED]: { type: 'SYSTEM', title: 'Payout settled' },
  [PlatformEventType.PAYOUT_REVERSED]: { type: 'SYSTEM', title: 'Payout reversed' },
  [PlatformEventType.ANTI_CHEAT_ENFORCED]: { type: 'SYSTEM', title: 'Account action' },
  [PlatformEventType.ACCOUNT_REVIEWED]: { type: 'SYSTEM', title: 'Account under review' },
};

/** In-app delivery adapter. Dedupes via the bus event.id, so retries are safe. */
@Injectable()
export class InAppEventSubscriber implements EventSubscriber {
  readonly name = 'in-app';
  constructor(private readonly notifications: NotificationService) {}

  async handle(event: PlatformEvent): Promise<boolean> {
    const m = TITLES[event.type];
    if (!m || !event.userId) return true; // not an in-app event
    await this.notifications.sendNotification(event.userId, m.type, m.title, m.title, {
      event_id: event.id,
      event_type: event.type,
    });
    return true;
  }
}
