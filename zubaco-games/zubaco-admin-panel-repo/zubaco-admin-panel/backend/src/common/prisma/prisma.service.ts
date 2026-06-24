import { lookup } from 'node:dns';

import { config } from '@config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { transactionContext } from './transaction.context';

export async function resolveIPv4(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
        lookup(hostname, { family: 4 }, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
}

/**
 * Prisma model names that participate in transparent transaction delegation.
 * Must be updated whenever a new model is added to schema.prisma.
 */
const PRISMA_MODEL_PROPERTIES = new Set([
    'admin',
    'adminAccessToken',
    'game',
    'gameContent',
    'stage',
    'gameStage',
    'tournament',
    'tournamentStage',
    'cheatFlag',
    'user',
    'authProvider',
    'gameProgress',
    'gameSession',
    'season',
    'seasonStage',
    'stageGame',
    'seasonEntry',
    'stageEntry',
    'wallet',
    'transaction',
    'notification',
    'seasonLeaderboard',
]);

/**
 * PrismaService with transparent transaction support via AsyncLocalStorage Proxy.
 * Any service method decorated with @Transactional() will automatically run
 * all Prisma calls inside the active transaction — no code changes needed in services.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(resolvedHost?: string) {
        const rawUrl = config.database.url;
        // Encode password before URL parsing — passwords may contain characters
        // like `[`, `<`, `>` that are invalid in URLs and break the URL constructor.
        const encodedUrl = rawUrl.replace(
            /^(postgresql:\/\/[^:]+):([^@]+)@/,
            (_match, userPart: string, pass: string) => `${userPart}:${encodeURIComponent(pass)}@`,
        );
        const dbUrl = new URL(encodedUrl);
        const host = resolvedHost ?? dbUrl.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        const pool = new Pool({
            host,
            port: Number(dbUrl.port) || 5432,
            database: dbUrl.pathname.slice(1),
            user: dbUrl.username,
            password: decodeURIComponent(dbUrl.password),
            ...(isLocal ? {} : { ssl: { rejectUnauthorized: false, servername: dbUrl.hostname } }),
        });
        const adapter = new PrismaPg(pool);
        super({ adapter });

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && PRISMA_MODEL_PROPERTIES.has(prop)) {
                    const txClient = transactionContext.getStore() as
                        | Record<string, unknown>
                        | undefined;
                    if (txClient) {
                        return txClient[prop];
                    }
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
