import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';

export interface CheatFlagEvent {
    referenceId: string;
    userId: string;
    gameType: number;
    flagType: number;
    createdAt: string;
    gameName: string;
}

@Injectable()
export class SnsService {
    private readonly logger = new Logger(SnsService.name);
    private readonly client = new SNSClient({
        region: config.aws.region,
    });

    /**
     * Publish a persisted anti-cheat flag event.
     * Retries up to 3 times with exponential backoff (500ms → 1s → 2s).
     *
     * @param {CheatFlagEvent} payload - cheat flag event value.
     */
    async publishCheatFlag(payload: CheatFlagEvent): Promise<void> {
        const delays = [500, 1000, 2000];
        let lastErr: Error | undefined;

        for (let attempt = 0; attempt <= delays.length; attempt++) {
            try {
                await this.client.send(
                    new PublishCommand({
                        TopicArn: config.aws.sns.cheatTopicArn,
                        Message: JSON.stringify(payload),
                        MessageAttributes: {
                            eventType: {
                                DataType: 'String',
                                StringValue: 'CHEAT_FLAG_DETECTED',
                            },
                            flagType: {
                                DataType: 'Number',
                                StringValue: String(payload.flagType),
                            },
                        },
                    }),
                );
                return;
            } catch (err) {
                lastErr = err as Error;
                if (attempt < delays.length) {
                    await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
                }
            }
        }

        this.logger.error(
            `[${payload.userId}] Failed to publish cheat flag ${payload.referenceId} after ${delays.length + 1} attempts: ${lastErr?.message}`,
        );
    }
}
