import {
    DeleteMessageCommand,
    Message,
    ReceiveMessageCommand,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { GAME_CONFIGS } from '@common/constants';
import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type MessageHandler = (message: Message) => Promise<void>;

@Injectable()
export class SqsService implements OnModuleDestroy {
    private readonly logger = new Logger(SqsService.name);
    private readonly client = new SQSClient({
        region: config.aws.region,
    });

    private readonly handlers: MessageHandler[] = [];
    private stopped = false;
    private polling = false;

    /**
     * Stop the polling loop so the service can shut down cleanly.
     *
     * @returns {void} No return value.
     */
    onModuleDestroy() {
        this.stopped = true;
    }

    /**
     * Register a message handler that will run for each received SQS message.
     *
     * @param {MessageHandler} handler - handler value.
     *
     * @returns {void} No return value.
     */
    subscribe(handler: MessageHandler) {
        this.handlers.push(handler);
        if (!this.polling) {
            this.polling = true;
            void this.poll();
        }
    }

    /**
     * Continuously poll SQS, dispatch messages to subscribers, and delete processed messages.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    private async poll() {
        while (!this.stopped) {
            try {
                const result = await this.client.send(
                    new ReceiveMessageCommand({
                        QueueUrl: config.aws.sqs.jobQueueUrl,
                        MaxNumberOfMessages: config.aws.sqs.maxMessages,
                        WaitTimeSeconds: config.aws.sqs.pollWaitSeconds,
                        MessageAttributeNames: ['All'],
                        AttributeNames: ['All'],
                    }),
                );

                const messages = result.Messages ?? [];

                await Promise.all(
                    messages.map(async (message) => {
                        try {
                            await Promise.all(this.handlers.map((handler) => handler(message)));
                            await this.client.send(
                                new DeleteMessageCommand({
                                    QueueUrl: config.aws.sqs.jobQueueUrl,
                                    ReceiptHandle: message.ReceiptHandle!,
                                }),
                            );
                        } catch (err) {
                            this.logger.error(
                                `Failed to process message ${message.MessageId}: ${(err as Error).message}`,
                            );
                        }
                    }),
                );
            } catch (err) {
                if (!this.stopped) {
                    this.logger.error(`SQS poll error: ${(err as Error).message}`);
                    await new Promise((resolve) =>
                        setTimeout(resolve, GAME_CONFIGS.SQS_POLL_ERROR_RETRY_MS),
                    );
                }
            }
        }
    }
}
