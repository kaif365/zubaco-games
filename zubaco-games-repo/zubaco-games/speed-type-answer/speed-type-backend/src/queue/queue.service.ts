import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.GAME_EVENTS) private readonly gameEventsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SESSION_CLEANUP) private readonly sessionCleanupQueue: Queue,
  ) {}

  async enqueueScoreSubmitted(data: {
    userId: string;
    stageId: string;
    score: number;
    gameSessionId: string;
  }): Promise<void> {
    await this.gameEventsQueue.add(JOB_NAMES.SCORE_SUBMITTED, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async enqueueSessionCompleted(data: {
    userId: string;
    gameSessionId: string;
    duration: number;
    status: string;
  }): Promise<void> {
    await this.gameEventsQueue.add(JOB_NAMES.SESSION_COMPLETED, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async enqueueCheatDetected(data: {
    userId: string;
    gameSessionId: string;
    severity: string;
    reason: string;
  }): Promise<void> {
    await this.gameEventsQueue.add(JOB_NAMES.CHEAT_DETECTED, data, {
      priority: 1, // High priority
      attempts: 5,
      backoff: { type: 'exponential', delay: 500 },
      removeOnComplete: 200,
      removeOnFail: 1000,
    });
  }

  async scheduleSessionCleanup(): Promise<void> {
    await this.sessionCleanupQueue.add(
      JOB_NAMES.CLEANUP_EXPIRED,
      {},
      {
        repeat: { every: 5 * 60 * 1000 }, // Every 5 minutes
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }
}
