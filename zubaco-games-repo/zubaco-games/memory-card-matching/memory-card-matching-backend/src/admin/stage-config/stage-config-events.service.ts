import { Message } from "@aws-sdk/client-sqs";
import { GAME_CONFIG_EVENT_TYPE } from "@common/constants";
import { PrismaService } from "@common/prisma/prisma.service";
import { config } from "@config";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { SqsService } from "../../aws/sqs.service";

import {
  buildDefaultStageConfig,
  DefaultStageConfigOptions,
} from "./stage-config.default";

interface StageGameEvent {
  stage_id: string;
  game_type: string;
  game_config?: {
    time_limit?: number | null;
    level_count?: number | null;
    board_count?: number | null;
    enable_demo?: boolean | null;
  };
}

/**
 * Synchronizes stage config records from external game configuration events.
 */
@Injectable()
export class StageConfigEventsService implements OnModuleInit {
  private readonly logger = new Logger(StageConfigEventsService.name);

  /**
   * Create a new instance.
   *
   * @param {SqsService} sqs - sqs value.
   * @param {PrismaService} prisma - prisma value.
   */
  constructor(
    private readonly sqs: SqsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle module initialization.
   *
   * @returns {void} Resolves when the operation completes.
   */
  onModuleInit() {
    this.sqs.subscribe((message) => this.handle(message));
  }

  /**
   * Handle incoming SQS message.
   *
   * @param {Message} message - message value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async handle(message: Message): Promise<void> {
    const eventType = message.MessageAttributes?.["event_type"]?.StringValue;

    if (
      eventType !== GAME_CONFIG_EVENT_TYPE.STAGE_ATTACHED &&
      eventType !== GAME_CONFIG_EVENT_TYPE.STAGE_DETACHED
    ) {
      return;
    }

    let body: StageGameEvent;
    try {
      body = JSON.parse(message.Body ?? "{}") as StageGameEvent;
    } catch {
      this.logger.warn(
        `Failed to parse SQS message body: ${message.MessageId}`,
      );
      return;
    }

    if (body.game_type !== config.gameTypeKey) {
      this.logger.debug(
        `Ignoring ${eventType} for game_type=${body.game_type} (expected ${config.gameTypeKey})`,
      );
      return;
    }

    const stageId = body.stage_id;
    if (!stageId) {
      this.logger.warn(
        `Missing stage_id in ${eventType} message ${message.MessageId}`,
      );
      return;
    }

    if (eventType === GAME_CONFIG_EVENT_TYPE.STAGE_ATTACHED) {
      await this.handleAttached(stageId, {
        timeLimit: body.game_config?.time_limit ?? undefined,
        boardCount:
          body.game_config?.board_count ??
          body.game_config?.level_count ??
          undefined,
        enableDemo: body.game_config?.enable_demo ?? undefined,
      });
      return;
    }

    await this.handleDetached(stageId);
  }

  /**
   * Handle attached stage event.
   *
   * @param {string} stageId - stage id value.
   * @param {DefaultStageConfigOptions} options - options value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async handleAttached(
    stageId: string,
    options: DefaultStageConfigOptions = {},
  ): Promise<void> {
    const existing = await this.prisma.stageConfig.findUnique({
      where: { stageId },
      select: { id: true, isEnabled: true, deletedAt: true },
    });

    if (existing) {
      if (existing.deletedAt) {
        await this.prisma.stageConfig.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            isEnabled: true,
          },
        });
        this.logger.log(`[${stageId}] Restored deleted stage config`);
        return;
      }

      if (!existing.isEnabled) {
        await this.prisma.stageConfig.update({
          where: { id: existing.id },
          data: { isEnabled: true },
        });
        this.logger.log(`[${stageId}] Re-enabled existing stage config`);
      }
      return;
    }

    const defaults = await buildDefaultStageConfig(
      stageId,
      this.prisma,
      options,
    );
    if (!defaults) {
      this.logger.warn(
        `[${stageId}] No eligible levels found for default config`,
      );
      return;
    }

    await this.prisma.stageConfig.create({
      data: {
        stageId: defaults.stageId,
        gameTimeLimitSeconds: defaults.gameTimeLimitSeconds,
        enableDemo: defaults.enableDemo,
        isEnabled: true,
        levels: {
          create: defaults.levels.map((level, index) => ({
            difficultyId: level.difficultyId,
            boardCount: level.boardCount,
            order: index,
          })),
        },
        demoLevels: {
          create: defaults.demoLevels.map((level, index) => ({
            difficultyId: level.difficultyId,
            boardCount: level.boardCount,
            order: index,
          })),
        },
      },
    });

    this.logger.log(`[${stageId}] Created default stage config`);
  }

  /**
   * Handle detached stage event.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async handleDetached(stageId: string): Promise<void> {
    const existing = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: { id: true, isEnabled: true },
    });

    if (!existing || !existing.isEnabled) {
      return;
    }

    await this.prisma.stageConfig.update({
      where: { id: existing.id },
      data: { isEnabled: false },
    });

    this.logger.log(`[${stageId}] Disabled stage config`);
  }
}
