import { lookup } from 'node:dns';

import { config } from '@config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { transactionContext } from './transaction.context';

/**
 * Resolve ipv4.
 *
 * @param {string} hostname - hostname value.
 *
 * @returns {Promise<string>} The string result.
 */
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
    'gameSession',
    'gameConfiguration',
    'gameInput',
    'gameCheatFlag',
] as const);

type PrismaModelProperty = keyof Pick<
    PrismaClient,
    'gameSession' | 'gameConfiguration' | 'gameInput' | 'gameCheatFlag'
>;

/**
 * Checks whether prisma model property.
 *
 * @param {string} prop - The prop.
 *
 * @returns {boolean} The result of isPrismaModelProperty.
 */
function isPrismaModelProperty(prop: string): prop is PrismaModelProperty {
    return PRISMA_MODEL_PROPERTIES.has(prop as PrismaModelProperty);
}

/**
 * PrismaService with transparent transaction support via AsyncLocalStorage Proxy.
 * Any service method decorated with @Transactional() will automatically run
 * all Prisma calls inside the active transaction — no code changes needed in services.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    /**
     * Create a new instance.
     *
     * @param {string} resolvedHost - resolved host value.
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
            /**
             * Gets .
             *
             * @param {this} target - The target.
             * @param {string | symbol} prop - The prop.
             * @param {any} receiver - The receiver.
             *
             * @returns {unknown} The result of get.
             */
            get(target, prop, receiver) {
                if (typeof prop === 'string' && isPrismaModelProperty(prop)) {
                    const store = transactionContext.getStore();
                    if (store?.tx) {
                        return store.tx[prop];
                    }
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    }

    /**
     * On module init.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    async onModuleInit() {
        await this.$connect();
    }

    /**
     * On module destroy.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
