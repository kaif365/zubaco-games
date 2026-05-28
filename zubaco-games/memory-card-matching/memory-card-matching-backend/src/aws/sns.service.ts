import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { config } from "@config";
import { Injectable, Logger } from "@nestjs/common";

export interface CheatFlagEvent {
  referenceId: string;
  userId: string;
  gameType: number;
  flagType: number;
  createdAt: string;
}

/**
 * Publishes cheat-flag events to SNS for downstream fraud monitoring.
 */
@Injectable()
export class SnsService {
  private readonly logger = new Logger(SnsService.name);
  private readonly client = new SNSClient({
    region: config.aws.region,
  });

  /**
   * Handle publish cheat flag.
   *
   * @param {CheatFlagEvent} payload - payload value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
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
    } catch (error) {
      this.logger.error(
        `[${payload.userId}] Failed to publish cheat flag ${payload.referenceId}: ${(error as Error).message}`,
      );
    }
  }
}
