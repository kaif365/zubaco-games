import { lookup } from 'node:dns';
import { isIP } from 'node:net';

import { config } from '@config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { transactionContext } from './transaction.context';

/**
 * Resolves a hostname to its IPv4 address.
 * @param {string} hostname - The hostname to resolve.
 * @returns {Promise<string>} The resolved IPv4 address.
 */
export async function resolveIPv4(hostname: string): Promise<string> {
    if (hostname === 'localhost' || isIP(hostname) !== 0) {
        return hostname;
    }

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
    'level',
    'board',
    'gameConfig',
    'gameSession',
    'gameSessionStageConfig',
    'gameSessionBoard',
    'gameSessionPath',
    'cheatFlag',
    'stageConfig',
    'stageLevelConfig',
    'stageDemoLevelConfig',
    'userStageDemoBoard',
]);

/**
 * PrismaService with transparent transaction support via AsyncLocalStorage Proxy.
 * Any service method decorated with @Transactional() will automatically run
 * all Prisma calls inside the active transaction — no code changes needed in services.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    /**
     * Creates a Prisma client with optional host override and transaction-aware proxying.
     * @param {string} [resolvedHost] - The optional resolved database host.
     */
    constructor(resolvedHost?: string) {
        const dbUrl = new URL(config.database.url);
        const host = resolvedHost ?? dbUrl.hostname;
        const pool = new Pool({
            host,
            port: Number(dbUrl.port) || 5432,
            database: decodeURIComponent(dbUrl.pathname.slice(1)),
            user: decodeURIComponent(dbUrl.username),
            password: decodeURIComponent(dbUrl.password),
            ssl: { rejectUnauthorized: false, servername: dbUrl.hostname },
        });
        const adapter = new PrismaPg(pool);
        super({ adapter });

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && PRISMA_MODEL_PROPERTIES.has(prop)) {
                    const txClient = transactionContext.getStore();
                    if (txClient) {
                        return (txClient as Record<string, unknown>)[prop];
                    }
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    }

    /**
     * Connects the Prisma client when the module initializes.
     * @returns {Promise<void>} A promise that resolves when the client is connected.
     */
    async onModuleInit() {
        await this.$connect();
    }

    /**
     * Disconnects the Prisma client when the module shuts down.
     * @returns {Promise<void>} A promise that resolves when the client is disconnected.
     */
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
