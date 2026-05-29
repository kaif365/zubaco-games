const fs = require('fs');
const path = require('path');

const all = [
  'flash-spot/flash-spot-backend','colour-sorting/colour-sorting-backend','object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend','true-false-blitz/true-false-blitz-backend','word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend','live-route-builder/live-route-backend','memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend','pattern-survival/pattern-survival-backend','speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend','memory-card-matching/memory-card-matching-backend','sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend','maze-navigation/maze-navigation-backend','Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend','logic-reflector/logic-reflector-backend',
];

// ─── Prisma Service with connection pool config & health ───
const prismaService = `import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      (this as any).$on('query', (e: any) => {
        if (e.duration > 500) {
          this.logger.warn(\`Slow query (\${e.duration}ms): \${e.query}\`);
        }
      });
    }

    (this as any).$on('error', (e: any) => {
      this.logger.error(\`Database error: \${e.message}\`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw\`SELECT 1\`;
      return true;
    } catch {
      return false;
    }
  }
}
`;

const prismaModule = `import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const prismaDir = path.join(dir, 'src/prisma');
  ensureDir(prismaDir);
  writeIfMissing(path.join(prismaDir, 'prisma.service.ts'), prismaService);
  writeIfMissing(path.join(prismaDir, 'prisma.module.ts'), prismaModule);
  console.log(`OK ${dir}`);
});

console.log('\\nP38 Done!');
