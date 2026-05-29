import { PrismaService } from "@common/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import {
  StageConfigService,
  type ResolvedStageConfig,
} from "../../admin/stage-config/stage-config.service";
import { GameService } from "../../game/game.service";
import type { LevelData } from "../../game/types/game.types";

export interface DemoDifficultyResult {
  difficultyId: string;
  difficultyName: string;
  levels: LevelData[];
}

export interface DemoResult {
  stageId: string;
  enableDemo: boolean;
  alreadySeen: boolean;
  difficulties: DemoDifficultyResult[];
}

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stageConfigService: StageConfigService,
    private readonly gameService: GameService,
  ) {}

  async getDemo(ownerKey: string, stageId: string): Promise<DemoResult> {
    const stageConfig =
      await this.stageConfigService.getResolvedDemoStageConfig(stageId);

    const existingGameSession = await this.prisma.gameSession.findFirst({
      where: { ownerKey, stageId },
      select: { id: true },
    });
    const alreadySeen = Boolean(existingGameSession);

    if (!stageConfig.enableDemo) {
      return {
        stageId,
        enableDemo: false,
        alreadySeen,
        difficulties: [],
      };
    }

    const existingSnapshot = await this.prisma.userStageDemoLevel.findFirst({
      where: { ownerKey, stageId },
      select: { id: true },
    });

    if (existingSnapshot) {
      return {
        stageId,
        enableDemo: true,
        alreadySeen,
        difficulties: await this.getExistingDemoDifficulties(ownerKey, stageId),
      };
    }

    if (stageConfig.demoLevelConfigs.length === 0) {
      return {
        stageId,
        enableDemo: true,
        alreadySeen,
        difficulties: [],
      };
    }

    try {
      const difficulties = await this.prisma.$transaction(async (tx) => {
        const alreadyCreated = await tx.userStageDemoLevel.findFirst({
          where: { ownerKey, stageId },
          select: { id: true },
        });

        if (alreadyCreated) {
          return this.getExistingDemoDifficulties(ownerKey, stageId, tx);
        }

        return this.createDemoSnapshot(ownerKey, stageId, stageConfig, tx);
      });

      return {
        stageId,
        enableDemo: true,
        alreadySeen,
        difficulties,
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return {
          stageId,
          enableDemo: true,
          alreadySeen,
          difficulties: await this.getExistingDemoDifficulties(
            ownerKey,
            stageId,
          ),
        };
      }

      throw error;
    }
  }

  private async createDemoSnapshot(
    ownerKey: string,
    stageId: string,
    stageConfig: ResolvedStageConfig,
    tx: Prisma.TransactionClient,
  ): Promise<DemoDifficultyResult[]> {
    const levelOffsets = new Map<string, number>();
    const selectedLevelsByDifficulty = stageConfig.demoLevels.reduce(
      (map, level) => {
        const existing = map.get(level.difficultyId) ?? [];
        existing.push(level);
        map.set(level.difficultyId, existing);
        return map;
      },
      new Map<string, typeof stageConfig.demoLevels>(),
    );

    const difficulties: DemoDifficultyResult[] = [];
    let levelIndex = 0;

    for (const demoConfig of stageConfig.demoLevelConfigs) {
      const selectedLevels =
        selectedLevelsByDifficulty.get(demoConfig.difficultyId) ?? [];
      const start = levelOffsets.get(demoConfig.difficultyId) ?? 0;
      const end = start + demoConfig.boardCount;
      const difficultyLevels = selectedLevels.slice(start, end);
      levelOffsets.set(demoConfig.difficultyId, end);

      if (difficultyLevels.length === 0) {
        continue;
      }

      const snapshotLevels: LevelData[] = [];

      for (const sourceLevel of difficultyLevels) {
        const levelData = this.gameService.buildLevelDataFromSourceLevel(
          sourceLevel,
          levelIndex,
        );

        await tx.userStageDemoLevel.create({
          data: {
            ownerKey,
            stageId,
            difficultyId: demoConfig.difficultyId,
            difficultyName: demoConfig.difficulty.name,
            sourceLevelId: sourceLevel.id,
            levelIndex,
            name: sourceLevel.name,
            gridRows: sourceLevel.gridRows,
            gridColumns: sourceLevel.gridColumns,
            cardContentType: sourceLevel.cardContentType,
            previewDurationSeconds: sourceLevel.previewDurationSeconds,
            mismatchDisplayDurationSeconds:
              sourceLevel.mismatchDisplayDurationSeconds,
            contentConfigSnapshot:
              sourceLevel.contentConfig as Prisma.InputJsonValue,
            cards: {
              createMany: {
                data: levelData.cards.map((card, sortOrder) => ({
                  levelIndex,
                  cardId: card.id,
                  pairId: card.pairId,
                  sortOrder,
                  contentType: card.contentType,
                  content: card.content,
                  imageUrl: card.imageUrl,
                })),
              },
            },
          },
        });

        snapshotLevels.push(levelData);
        levelIndex++;
      }

      difficulties.push({
        difficultyId: demoConfig.difficultyId,
        difficultyName: demoConfig.difficulty.name,
        levels: snapshotLevels,
      });
    }

    return difficulties;
  }

  private async getExistingDemoDifficulties(
    ownerKey: string,
    stageId: string,
    client?: Prisma.TransactionClient,
  ): Promise<DemoDifficultyResult[]> {
    const prisma = client ?? this.prisma;
    const demoLevels = await prisma.userStageDemoLevel.findMany({
      where: { ownerKey, stageId },
      orderBy: { levelIndex: "asc" },
      include: {
        cards: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (demoLevels.length === 0) {
      return [];
    }

    const difficulties: DemoDifficultyResult[] = [];

    for (const demoLevel of demoLevels) {
      const formattedLevel: LevelData = {
        id: demoLevel.sourceLevelId,
        levelIndex: demoLevel.levelIndex,
        gridRows: demoLevel.gridRows,
        gridColumns: demoLevel.gridColumns,
        cardContentType:
          demoLevel.cardContentType as LevelData["cardContentType"],
        previewDurationSeconds: demoLevel.previewDurationSeconds,
        mismatchDisplayDurationSeconds:
          demoLevel.mismatchDisplayDurationSeconds,
        cards: demoLevel.cards.map((card) => ({
          id: card.cardId,
          pairId: card.pairId,
          contentType:
            card.contentType as LevelData["cards"][number]["contentType"],
          content: card.content,
          imageUrl: card.imageUrl,
          isTurned: false,
        })),
      };

      const existingDifficulty = difficulties.find(
        (difficulty) => difficulty.difficultyId === demoLevel.difficultyId,
      );

      if (existingDifficulty) {
        existingDifficulty.levels.push(formattedLevel);
        continue;
      }

      difficulties.push({
        difficultyId: demoLevel.difficultyId,
        difficultyName: demoLevel.difficultyName,
        levels: [formattedLevel],
      });
    }

    return difficulties;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
