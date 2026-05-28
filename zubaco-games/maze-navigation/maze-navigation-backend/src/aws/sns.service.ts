import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { config } from "@common/config/env.config";
import { Injectable, Logger } from "@nestjs/common";

export interface CheatFlagEvent {
  referenceId: string;
  userId: string;
  gameType: number;
  flagType: number;
  createdAt: string;
}

@Injectable()
export class SnsService {
  private readonly logger = new Logger(SnsService.name);
  private readonly client = new SNSClient({
    region: config.aws.region,
  });

  /**
   * Publish a persisted anti-cheat flag event.
   *
   * @param {CheatFlagEvent} payload - cheat flag event value.
   */
  async publishCheatFlag(payload: CheatFlagEvent): Promise<void> {
    try {
      await this.client.send(
        new PublishCommand({
          TopicArn: config.aws.sns.cheatTopicArn,
          Message: JSON.stringify(payload),
          MessageAttributes: {
            eventType: {
              DataType: "String",
              StringValue: "CHEAT_FLAG_DETECTED",
            },
            flagType: {
              DataType: "Number",
              StringValue: String(payload.flagType),
            },
          },
        }),
      );
    } catch (err) {
      this.logger.error(
        `[${payload.userId}] Failed to publish cheat flag ${payload.referenceId}: ${(err as Error).message}`,
      );
    }
  }
}
