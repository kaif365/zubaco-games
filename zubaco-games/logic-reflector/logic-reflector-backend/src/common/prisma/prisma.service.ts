import { lookup } from "node:dns";
import { isIP } from "node:net";

import { config } from "@config";
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { transactionContext } from "./transaction.context";

/**
 * Resolve ipv4.
 *
 * @param {string} hostname - hostname value.
 *
 * @returns {Promise<string>} The string result.
 */
export async function resolveIPv4(hostname: string): Promise<string> {
  if (hostname === "localhost" || isIP(hostname) !== 0) {
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
  "level",
  "board",
  "boardCell",
  "boardBlock",
  "boardAvailableBlock",
  "gameSession",
  "gameSessionBoard",
  "gameSessionBlock",
  "gameMove",
  "stageConfig",
  "stageLevelConfig",
  "stageDemoLevelConfig",
  "gameSessionStageConfig",
  "gameSessionStageLevelConfig",
  "cheatFlag",
  "userStageDemoBoard",
  "userStageDemoCell",
  "userStageDemoBlock",
]);

const PRISMA_TRANSACTION_METHODS = new Set([
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
]);

/**
 * PrismaService with transparent transaction support via AsyncLocalStorage Proxy.
 * Any service method decorated with @Transactional() will automatically run
 * all Prisma calls inside the active transaction — no code changes needed in services.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Create a new instance.
   *
   * @param {string} resolvedHost - resolved host value.
   */
  constructor(resolvedHost?: string) {
    const dbUrl = new URL(config.database.url);
    const host = resolvedHost ?? dbUrl.hostname;
    const sslMode = dbUrl.searchParams.get("sslmode");
    const isSslDisabled = sslMode === "disable" || sslMode === "false";

    const pool = new Pool({
      host,
      port: Number(dbUrl.port) || 5432,
      database: decodeURIComponent(dbUrl.pathname.slice(1)),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      ssl: isSslDisabled
        ? false
        : { rejectUnauthorized: false, servername: dbUrl.hostname },
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    return new Proxy(this, {
      /**
       * Handle get.
       *
       * @param {this} target - target value.
       * @param {string | symbol} prop - prop value.
       * @param {any} receiver - receiver value.
       *
       * @returns {any} The resolved property value.
       */
      get(target, prop, receiver) {
        const tx = transactionContext.getStore() as
          | (PrismaClient & Record<string, unknown>)
          | undefined;
        if (typeof prop === "string" && PRISMA_MODEL_PROPERTIES.has(prop)) {
          if (tx) {
            return tx[prop];
          }
        }
        if (typeof prop === "string" && PRISMA_TRANSACTION_METHODS.has(prop)) {
          if (tx) {
            const method = tx[prop];
            if (typeof method === "function") {
              const transactionMethod = method as (
                ...args: unknown[]
              ) => unknown;
              return (...args: unknown[]): unknown =>
                transactionMethod.apply(tx, args);
            }
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  /**
   * Handle on module init.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Handle on module destroy.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
