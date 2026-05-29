import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { config } from "@common/config/env.config";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly client = new SQSClient({
    region: config.aws.region,
  });

  /**
   * Send a message to the job queue.
   *
   * @param {object} payload - message payload.
   */
  async sendMessage(payload: object): Promise<void> {
    try {
      await this.client.send(
        new SendMessageCommand({
          QueueUrl: config.aws.sqs.jobQueueUrl,
          MessageBody: JSON.stringify(payload),
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to send SQS message: ${(err as Error).message}`,
      );
    }
  }
}
