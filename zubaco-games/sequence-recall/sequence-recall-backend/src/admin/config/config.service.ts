import { WRONG_MOVE_HANDLING } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { UpsertConfigDto } from './dto/upsert-config.dto';

@Injectable()
export class ConfigService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Upsert.
     *
     * @param {UpsertConfigDto} dto - Data transfer object.
     * @param {string} dto.stageId - The stage id.
     * @param {number} dto.timeLimit - The time limit.
     * @param {number} dto.minSequence - The min sequence.
     * @param {number} dto.maxSequence - The max sequence.
     * @param {number | undefined} [dto.demoMinSequence] - The demo min sequence.
     * @param {boolean | undefined} [dto.enableDemo] - The enable demo.
     * @param {number | undefined} [dto.demoMaxSequence] - The demo max sequence.
     * @param {number} dto.flashDelay - The flash delay.
     * @param {number | undefined} [dto.bonusTimeRatio] - The bonus time ratio.
     * @param {number | undefined} [dto.cellCount] - The cell count.
     * @param {number} dto.scorePerClick - The score per click.
     * @param {number | undefined} [dto.wrongMoveHandling] - The wrong move handling.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    async upsert(dto: UpsertConfigDto) {
        const configData = {
            timeLimit: dto.timeLimit,
            minSequence: dto.minSequence,
            maxSequence: dto.maxSequence,
            enableDemo: dto.enableDemo ?? true,
            demoMinSequence: dto.demoMinSequence ?? 0,
            demoMaxSequence: dto.demoMaxSequence ?? 0,
            flashDelay: dto.flashDelay,
            levelDelay: dto.levelDelay ?? 0,
            bonusTimeRatio: dto.bonusTimeRatio ?? 1.0,
            cellCount: dto.cellCount ?? 4,
            scorePerClick: dto.scorePerClick,
            wrongMoveHandling: dto.wrongMoveHandling ?? WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
        };

        await this.prisma.gameConfiguration.upsert({
            where: { stageId: dto.stageId },
            update: { ...configData, deletedAt: null },
            create: { stageId: dto.stageId, ...configData },
        });
    }

    /**
     * Remove.
     *
     * @param {string[]} stageIds - The stage ids.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    async remove(stageIds: string[]) {
        if (!stageIds || stageIds.length === 0) {
            return;
        }

        await this.prisma.gameConfiguration.updateMany({
            where: { stageId: { in: stageIds } },
            data: { deletedAt: new Date() },
        });
    }

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
            throw new NotFoundException('CONFIG_NOT_FOUND');
        }
        return config;
    }

    /**
     * List configs.
     *
     * @param {string | undefined} stageId - The stage id.
     * @param {number} skip - The skip.
     * @param {number} limit - The limit.
     *
     * @returns {Promise<{ data: { id: string; stageId: string; cellCount: number; timeLimit: number; minSequence: number; maxSequence: number; enableDemo: boolean; demoMinSequence: number; demoMaxSequence: number; flashDelay: number; bonusTimeRatio: number; scorePerClick: number; wrongMoveHandling: number; createdAt: Date; }[]; totalCount: number; }>} A promise that resolves with the result.
     */
    async listConfigs(stageId?: string, skip: number = 0, limit: number = 10) {
        const whereClause = {
            ...(stageId && { stageId }),
            deletedAt: null,
        };

        const [records, totalCount] = await Promise.all([
            this.prisma.gameConfiguration.findMany({
                where: whereClause,
                orderBy: [{ stageId: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.gameConfiguration.count({ where: whereClause }),
        ]);

        const data = records.map((record) => {
            const { updatedAt: removedUpdatedAt, deletedAt: removedDeletedAt, ...rest } = record;
            void removedUpdatedAt;
            void removedDeletedAt;
            return rest;
        });

        return {
            data,
            totalCount,
        };
    }
}
