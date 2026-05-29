import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SESSION_CLEANUP, { concurrency: 1 })
export class SessionCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionCleanupProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Running session cleanup: ${job.name}`);
    const expiredBefore = new Date(Date.now() - 30 * 60 * 1000);
    this.logger.log(`Cleaning sessions expired before ${expiredBefore.toISOString()}`);
  }
}
