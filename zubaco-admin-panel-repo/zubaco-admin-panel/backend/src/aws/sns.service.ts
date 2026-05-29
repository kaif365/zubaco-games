import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';

export interface SnsMessageAttribute {
    DataType: 'String' | 'Number';
    StringValue: string;
}

export interface SnsPublishInput<T extends Record<string, unknown> = Record<string, unknown>> {
    topicArn: string;
    payload: T;
    messageAttributes: Record<string, SnsMessageAttribute>;
}

@Injectable()
export class SnsService {
    private readonly logger = new Logger(SnsService.name);
    private readonly client = new SNSClient({
        region: config.aws.region,
        credentials: {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
        },
    });

    async publish<T extends Record<string, unknown>>(input: SnsPublishInput<T>): Promise<void> {
        try {
            await this.client.send(
                new PublishCommand({
                    TopicArn: input.topicArn,
                    Message: JSON.stringify(input.payload),
                    MessageAttributes: input.messageAttributes,
                }),
            );
        } catch (err) {
            this.logger.error(`Failed to publish to ${input.topicArn}: ${(err as Error).message}`);
        }
    }
}
