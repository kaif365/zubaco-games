import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { config } from "@common/config/env.config";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { StageConfigService } from "../admin/stage-config/stage-config.service";

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly client = new SQSClient({
    region: config.aws.region,
  });

  constructor(private readonly stageConfigService: StageConfigService) {}

  onModuleInit() {
    // Start polling in background
    void this.pollMessages();
  }

  private async pollMessages() {
    this.logger.log(
      `Starting SQS consumer polling queue: ${config.aws.sqs.jobQueueUrl}`,
    );

    while (true) {
      try {
        const response = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: config.aws.sqs.jobQueueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 20, // Long polling
          }),
        );

        if (response.Messages) {
          for (const message of response.Messages) {
            if (message.Body) {
              await this.handleMessage(JSON.parse(message.Body));
            }

            // Delete message after processing
            await this.client.send(
              new DeleteMessageCommand({
                QueueUrl: config.aws.sqs.jobQueueUrl,
                ReceiptHandle: message.ReceiptHandle!,
              }),
            );
          }
        }
      } catch (err) {
        this.logger.error(`Error polling SQS: ${(err as Error).message}`);
        // Wait before retrying on error
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async handleMessage(payload: any) {
    try {
      this.logger.debug(`Received SQS message: ${JSON.stringify(payload)}`);

      const { eventType, data } = payload;

      if (
        eventType === "STAGE_CONFIG_UPDATED" ||
        eventType === "STAGE_CONFIG_CREATED"
      ) {
        this.logger.log(`Syncing StageConfig for stageId: ${data.stageId}`);
        await this.stageConfigService.update({
          stageId: data.stageId,
          timeLimit: data.timeLimit,
          enableDemo: data.enableDemo,
          levels: data.levels,
          demoLevels: data.demoLevels,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle SQS message: ${(err as Error).message}`,
      );
    }
  }
}
