import { GAME_IDS, GAME_NAMES, SORT_ORDER } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPaginationMeta } from '@common/utils/pagination.util';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SqsService } from '../aws/sqs.service';
import type { CheatFlagEvent } from '../aws/sqs.service';

import type { ListCheatFlagsPayload } from './dto/list-cheat-flags.dto';

@Injectable()
export class CheatFlagsService implements OnModuleInit {
    private readonly logger = new Logger(CheatFlagsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly sqs: SqsService,
    ) {}

    onModuleInit(): void {
        this.sqs.registerHandler((event) => this.handleEvent(event));
    }

    private async handleEvent(event: CheatFlagEvent): Promise<void> {
        const gameName = GAME_NAMES[event.gameType];
        const validGameTypes = new Set<number>(Object.values(GAME_IDS));
        const validGameType = validGameTypes.has(event.gameType);

        if (!validGameType || !gameName) {
            this.logger.warn(
                `Unknown gameType "${event.gameType}" — dropping cheat flag ${event.referenceId}`,
            );
            return;
        }

        const game = await this.prisma.game.findUnique({
            where: { name: gameName },
            select: { id: true },
        });

        if (!game) {
            this.logger.warn(
                `Unknown game "${gameName}" for gameType=${event.gameType} — dropping cheat flag ${event.referenceId}`,
            );
            return;
        }

        await this.prisma.cheatFlag.upsert({
            where: { reference_id: event.referenceId },
            create: {
                reference_id: event.referenceId,
                user_id: event.userId,
                flag_type: event.flagType,
                game_type: event.gameType,
                game_id: game.id,
                game_created_at: new Date(event.createdAt),
            },
            update: {},
        });
        this.logger.log(
            `Saved cheat flag ${event.referenceId} (user=${event.userId} type=${event.flagType} gameType=${event.gameType} game=${gameName})`,
        );
    }

    async listCheatFlags(query: ListCheatFlagsPayload) {
        const { page, limit, userId, flagType, gameId } = query;
        const skip = (page - 1) * limit;

        const gameUuid = gameId !== undefined ? await this.resolveGameUuid(gameId) : undefined;
        if (gameId !== undefined && !gameUuid) {
            return { items: [], pagination: buildPaginationMeta({ page, limit, total: 0 }) };
        }

        const where = {
            ...(userId ? { user_id: userId } : {}),
            ...(flagType !== undefined ? { flag_type: flagType } : {}),
            ...(gameUuid ? { game_id: gameUuid } : {}),
        };

        const [total, items] = await Promise.all([
            this.prisma.cheatFlag.count({ where }),
            this.prisma.cheatFlag.findMany({
                where,
                orderBy: { received_at: SORT_ORDER.DESC },
                skip,
                take: limit,
            }),
        ]);

        return {
            items,
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    private async resolveGameUuid(gameId: number): Promise<string | null> {
        const gameName = GAME_NAMES[gameId];
        if (!gameName) {
            return null;
        }

        const game = await this.prisma.game.findUnique({
            where: { name: gameName },
            select: { id: true },
        });
        return game?.id ?? null;
    }
}
