import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue(QUEUE_NAMES.GAME_EVENTS) private readonly gameEventsQueue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const waiting = await this.gameEventsQueue.getWaitingCount();
      const active = await this.gameEventsQueue.getActiveCount();
      const failed = await this.gameEventsQueue.getFailedCount();
      const result = this.getStatus(key, true, { waiting, active, failed });
      return result;
    } catch {
      const result = this.getStatus(key, false);
      throw new HealthCheckError('Queue check failed', result);
    }
  }
}
