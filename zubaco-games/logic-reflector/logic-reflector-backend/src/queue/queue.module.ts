import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { GameEventsProcessor } from './processors/game-events.processor';
import { SessionCleanupProcessor } from './processors/session-cleanup.processor';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.GAME_EVENTS },
      { name: QUEUE_NAMES.SESSION_CLEANUP },
    ),
  ],
  providers: [GameEventsProcessor, SessionCleanupProcessor, QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
