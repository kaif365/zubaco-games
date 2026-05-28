import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma service wrapper responsible for opening and closing the shared DB client.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Handle on module init.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Handle on module destroy.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
