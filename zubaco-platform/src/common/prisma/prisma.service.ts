import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // OPS-S2 (O-DB): bound the underlying node-postgres pool. Previously
    // DATABASE_POOL_SIZE was defined in .env but never applied, so the adapter
    // used the driver default. Making it explicit lets each instance's pool be
    // sized to the deployment (total pool = replicas * max must stay under the
    // Postgres max_connections limit).
    const max = parseInt(process.env.DATABASE_POOL_SIZE || '10', 10);
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max });
    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
