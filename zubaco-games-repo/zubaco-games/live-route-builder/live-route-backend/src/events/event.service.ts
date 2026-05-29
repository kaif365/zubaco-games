import { Injectable, Logger } from '@nestjs/common';
import { GameEvent, GameEventType, EventPublisher } from './event.types';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private publisher: EventPublisher;

  constructor() {
    const snsTopicArn = process.env.SNS_TOPIC_ARN;
    const awsRegion = process.env.AWS_REGION || 'ap-south-1';

    if (snsTopicArn) {
      this.publisher = new SnsPublisher(snsTopicArn, awsRegion);
      this.logger.log(`Event publishing via SNS topic: ${snsTopicArn}`);
    } else {
      this.publisher = new LocalPublisher(this.logger);
      this.logger.log('Event publishing in local/log mode (SNS_TOPIC_ARN not set)');
    }
  }

  async publishGameCompleted(sessionId: string, userId: string, stageId: string, score: number) {
    await this.publisher.publish({
      type: GameEventType.GAME_COMPLETED,
      gameId: process.env.GAME_ID || 'unknown',
      sessionId,
      userId,
      stageId,
      timestamp: new Date().toISOString(),
      payload: { score },
    });
  }

  async publishCheatFlagged(sessionId: string, userId: string, stageId: string, flags: { reason: string; severity: string }[]) {
    await this.publisher.publish({
      type: GameEventType.CHEAT_FLAGGED,
      gameId: process.env.GAME_ID || 'unknown',
      sessionId,
      userId,
      stageId,
      timestamp: new Date().toISOString(),
      payload: { flags },
    });
  }

  async publishScoreAnomaly(sessionId: string, userId: string, stageId: string, clientScore: number, serverScore: number) {
    await this.publisher.publish({
      type: GameEventType.SCORE_ANOMALY,
      gameId: process.env.GAME_ID || 'unknown',
      sessionId,
      userId,
      stageId,
      timestamp: new Date().toISOString(),
      payload: { clientScore, serverScore, diff: Math.abs(clientScore - serverScore) },
    });
  }
}

class LocalPublisher implements EventPublisher {
  constructor(private readonly logger: Logger) {}

  async publish(event: GameEvent): Promise<void> {
    this.logger.debug(`[EVENT] ${event.type}: ${JSON.stringify(event.payload)}`);
  }
}

class SnsPublisher implements EventPublisher {
  private sns: any = null;
  private snsModule: any = null;
  private readonly topicArn: string;
  private readonly region: string;

  constructor(topicArn: string, region: string) {
    this.topicArn = topicArn;
    this.region = region;
  }

  private async loadSdk() {
    if (!this.snsModule) {
      const mod = '@aws-sdk/client-sns';
      this.snsModule = await (Function('m', 'return import(m)')(mod));
      this.sns = new this.snsModule.SNSClient({ region: this.region });
    }
  }

  async publish(event: GameEvent): Promise<void> {
    await this.loadSdk();
    await this.sns.send(
      new this.snsModule.PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: event.type },
          gameId: { DataType: 'String', StringValue: event.gameId },
        },
      }),
    );
  }
}
