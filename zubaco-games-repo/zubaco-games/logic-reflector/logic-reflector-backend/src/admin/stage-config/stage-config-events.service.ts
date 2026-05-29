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
    enable_demo?: boolean | null;
  };
}

@Injectable()
export class StageConfigEventsService implements OnModuleInit {
  private readonly logger = new Logger(StageConfigEventsService.name);

  constructor(
    private readonly sqs: SqsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register the stage config event handler when the module starts.
   *
   * @returns {void} No return value.
   */
  onModuleInit() {
    this.sqs.subscribe((message) => this.handle(message));
  }

  /**
   * Route supported stage events from SQS to the appropriate stage config action.
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

    const { stage_id: stageId } = body;

    if (!stageId) {
      this.logger.warn(
        `Missing stage_id in ${eventType} message ${message.MessageId}`,
      );
      return;
    }

    if (eventType === GAME_CONFIG_EVENT_TYPE.STAGE_ATTACHED) {
      await this.handleAttached(stageId, {
        timeLimit: body.game_config?.time_limit ?? undefined,
        enableDemo: body.game_config?.enable_demo ?? undefined,
      });
    } else {
      await this.handleDetached(stageId);
    }
  }

  /**
   * Re-enable an existing stage config or create a default one for a newly attached stage.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async handleAttached(
    stageId: string,
    options: DefaultStageConfigOptions = {},
  ): Promise<void> {
    const existing = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: { id: true, isEnabled: true },
    });

    if (existing) {
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

    const stageConfig = await this.prisma.stageConfig.create({
      data: {
        stageId: defaults.stageId,
        timeLimit: defaults.timeLimit,
        enableDemo: defaults.enableDemo,
        isEnabled: true,
      },
    });

    await this.prisma.stageLevelConfig.createMany({
      data: defaults.levels.map((level) => ({
        stageConfigId: stageConfig.id,
        levelId: level.levelId,
        boardCount: level.boardCount,
        order: level.order,
      })),
    });

    this.logger.log(
      `[${stageId}] Created default stage config with ${defaults.levels.length} level(s)`,
    );
  }

  /**
   * Disable the active stage config for a detached stage without removing its data.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  private async handleDetached(stageId: string): Promise<void> {
    const existing = await this.prisma.stageConfig.findFirst({
      where: { stageId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return;
    }

    await this.prisma.stageConfig.update({
      where: { id: existing.id },
      data: { isEnabled: false },
    });

    this.logger.log(`[${stageId}] Disabled stage config`);
  }
}
