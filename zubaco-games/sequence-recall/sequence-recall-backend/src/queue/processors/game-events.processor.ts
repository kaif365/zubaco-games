import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.GAME_EVENTS, {
  concurrency: 5,
  limiter: { max: 100, duration: 60000 },
})
export class GameEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(GameEventsProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'score-submitted':
        await this.handleScoreSubmitted(job.data);
        break;
      case 'session-completed':
        await this.handleSessionCompleted(job.data);
        break;
      case 'cheat-detected':
        await this.handleCheatDetected(job.data);
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  private async handleScoreSubmitted(data: {
    userId: string;
    stageId: string;
    score: number;
    gameSessionId: string;
  }): Promise<void> {
    this.logger.log(`Processing score: user=${data.userId} stage=${data.stageId} score=${data.score}`);
  }

  private async handleSessionCompleted(data: {
    userId: string;
    gameSessionId: string;
    duration: number;
    status: string;
  }): Promise<void> {
    this.logger.log(`Session completed: user=${data.userId} session=${data.gameSessionId} status=${data.status}`);
  }

  private async handleCheatDetected(data: {
    userId: string;
    gameSessionId: string;
    severity: string;
    reason: string;
  }): Promise<void> {
    this.logger.warn(`Cheat detected: user=${data.userId} severity=${data.severity} reason=${data.reason}`);
  }
}
