import {
    DeleteMessageCommand,
    Message,
    ReceiveMessageCommand,
    SendMessageCommand,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface SqsMessageAttribute {
    DataType: 'String' | 'Number';
    StringValue: string;
}

export interface SqsSendInput<T extends Record<string, unknown> = Record<string, unknown>> {
    queueUrl: string;
    payload: T;
    messageAttributes?: Record<string, SqsMessageAttribute>;
}

export interface CheatFlagEvent {
    referenceId: string;
    userId: string;
    gameType: number;
    flagType: number;
    createdAt: string;
}

export type CheatFlagHandler = (event: CheatFlagEvent) => Promise<void>;

@Injectable()
export class SqsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SqsService.name);
    private readonly client = new SQSClient({
        region: config.aws.region,
        credentials: {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
        },
    });
    private readonly queueUrl = config.aws.sqs.cheatFlagQueueUrl;
    private handler: CheatFlagHandler | null = null;
    private running = false;

    async sendMessage<T extends Record<string, unknown>>(input: SqsSendInput<T>): Promise<void> {
        try {
            await this.client.send(
                new SendMessageCommand({
                    QueueUrl: input.queueUrl,
                    MessageBody: JSON.stringify(input.payload),
                    ...(input.messageAttributes && {
                        MessageAttributes: input.messageAttributes,
                    }),
                }),
            );
        } catch (err) {
            this.logger.error(`Failed to send to ${input.queueUrl}: ${(err as Error).message}`);
        }
    }

    registerHandler(handler: CheatFlagHandler): void {
        this.handler = handler;
        this.running = true;
        void this.pollLoop();
    }

    onModuleInit(): void {
        // Polling starts only after registerHandler is called.
        // CheatFlagsService calls it in its own onModuleInit,
        // which runs after this service is already initialised.
    }

    onModuleDestroy(): void {
        this.running = false;
    }

    private async pollLoop(): Promise<void> {
        while (this.running) {
            try {
                await this.poll();
            } catch (err) {
                this.logger.error(`SQS poll error: ${(err as Error).message}`);
                await this.sleep(5_000);
            }
        }
    }

    private async poll(): Promise<void> {
        const { Messages = [] } = await this.client.send(
            new ReceiveMessageCommand({
                QueueUrl: this.queueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
            }),
        );
        for (const msg of Messages) {
            await this.processMessage(msg);
        }
    }

    private async processMessage(msg: Message): Promise<void> {
        if (!msg.Body || !msg.ReceiptHandle) {
            return;
        }

        const event = this.parse(msg.Body);
        if (!event) {
            this.logger.warn(`Unreadable SQS message body: ${msg.Body}`);
            this.logger.warn(`Dropping unreadable SQS message ${msg.MessageId}`);
            await this.delete(msg.ReceiptHandle);
            return;
        }

        try {
            await this.handler!(event);
            await this.delete(msg.ReceiptHandle);
        } catch (err) {
            this.logger.error(
                `Failed processing message ${msg.MessageId}: ${(err as Error).message}`,
            );
        }
    }

    private parse(body: string): CheatFlagEvent | null {
        try {
            const outer = JSON.parse(body) as Record<string, unknown>;
            const raw =
                typeof outer['Message'] === 'string'
                    ? (JSON.parse(outer['Message']) as Record<string, unknown>)
                    : outer;

            if (
                typeof raw['referenceId'] !== 'string' ||
                typeof raw['userId'] !== 'string' ||
                typeof raw['gameType'] !== 'number' ||
                typeof raw['flagType'] !== 'number' ||
                typeof raw['createdAt'] !== 'string'
            ) {
                return null;
            }

            return {
                referenceId: raw['referenceId'],
                userId: raw['userId'],
                gameType: raw['gameType'],
                flagType: raw['flagType'],
                createdAt: raw['createdAt'],
            };
        } catch {
            return null;
        }
    }

    private async delete(receiptHandle: string): Promise<void> {
        await this.client.send(
            new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle,
            }),
        );
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
