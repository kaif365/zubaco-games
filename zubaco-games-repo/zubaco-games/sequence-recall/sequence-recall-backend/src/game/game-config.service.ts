import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GameConfigService {
    constructor(private prisma: PrismaService) {}

    /**
     * Gets active config.
     *
     * @param {string} stageId - The stage id.
     *
     * @returns {Promise<{ id: string; stageId: string; cellCount: number; timeLimit: number; minSequence: number; maxSequence: number; enableDemo: boolean; demoMinSequence: number; demoMaxSequence: number; flashDelay: number; bonusTimeRatio: number; scorePerClick: number; wrongMoveHandling: number; createdAt: Date; updatedAt: Date; deletedAt: Date | null; }>} A promise that resolves with the result.
     */
    async getActiveConfig(stageId: string) {
        const config = await this.prisma.gameConfiguration.findFirst({
            where: { stageId, deletedAt: null },
        });

        if (!config) {
            throw new NotFoundException(`No configuration for stage ${stageId}`);
        }

        return config;
    }

    /**
     * Upsert config.
     *
     * @param {{ stageId: string; minSequence: number; maxSequence: number; demoMinSequence: number; demoMaxSequence: number; enableDemo?: boolean; flashDelay: number; cellCount?: number; timeLimit?: number; bonusTimeRatio?: number; scorePerClick?: number; }} data - The data.
     *
     * @returns {Promise<{ id: string; stageId: string; cellCount: number; timeLimit: number; minSequence: number; maxSequence: number; enableDemo: boolean; demoMinSequence: number; demoMaxSequence: number; flashDelay: number; bonusTimeRatio: number; scorePerClick: number; wrongMoveHandling: number; createdAt: Date; updatedAt: Date; deletedAt: Date | null; }>} A promise that resolves with the result.
     */
    async upsertConfig(data: {
        stageId: string;
        minSequence: number;
        maxSequence: number;
        demoMinSequence: number;
        demoMaxSequence: number;
        enableDemo?: boolean;
        flashDelay: number;
        levelDelay?: number;
        cellCount?: number;
        timeLimit?: number;
        bonusTimeRatio?: number;
        scorePerClick?: number;
    }) {
        return this.prisma.gameConfiguration.upsert({
            where: {
                stageId: data.stageId,
            },
            update: {
                minSequence: data.minSequence,
                maxSequence: data.maxSequence,
                demoMinSequence: data.demoMinSequence,
                demoMaxSequence: data.demoMaxSequence,
                ...(data.enableDemo !== undefined && { enableDemo: data.enableDemo }),
                flashDelay: data.flashDelay,
                levelDelay: data.levelDelay ?? 0,
                cellCount: data.cellCount ?? 4,
                ...(data.timeLimit !== undefined && { timeLimit: data.timeLimit }),
                ...(data.bonusTimeRatio !== undefined && { bonusTimeRatio: data.bonusTimeRatio }),
                ...(data.scorePerClick !== undefined && { scorePerClick: data.scorePerClick }),
                deletedAt: null,
            },
            create: {
                stageId: data.stageId,
                minSequence: data.minSequence,
                maxSequence: data.maxSequence,
                demoMinSequence: data.demoMinSequence,
                demoMaxSequence: data.demoMaxSequence,
                enableDemo: data.enableDemo ?? true,
                flashDelay: data.flashDelay,
                levelDelay: data.levelDelay ?? 0,
                cellCount: data.cellCount ?? 4,
                timeLimit: data.timeLimit ?? 180,
                bonusTimeRatio: data.bonusTimeRatio ?? 1.0,
                scorePerClick: data.scorePerClick ?? 20,
            },
        });
    }

    /**
     * List configs.
     *
     * @param {string | undefined} stageId - The stage id.
     *
     * @returns {Promise<{ id: string; stageId: string; cellCount: number; timeLimit: number; minSequence: number; maxSequence: number; enableDemo: boolean; demoMinSequence: number; demoMaxSequence: number; flashDelay: number; bonusTimeRatio: number; scorePerClick: number; wrongMoveHandling: number; createdAt: Date; updatedAt: Date; deletedAt: Date | null; }[]>} A promise that resolves with the result.
     */
    async listConfigs(stageId?: string) {
        return this.prisma.gameConfiguration.findMany({
            where: {
                ...(stageId && { stageId }),
                deletedAt: null,
            },
            orderBy: [{ stageId: 'asc' }],
        });
    }
}
