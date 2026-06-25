import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(new (require('pg').Pool)({ host: new URL(process.env.DATABASE_URL).hostname, port: Number(new URL(process.env.DATABASE_URL).port) || 5432, database: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)), user: decodeURIComponent(new URL(process.env.DATABASE_URL).username), password: decodeURIComponent(new URL(process.env.DATABASE_URL).password), ssl: new URL(process.env.DATABASE_URL).searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false } })) });

const stages = [
    {
      stageId: 'live-route-stage-1',
      nodeIntervalMs: 3000,
      totalNodes: 10,
      timeLimitMs: 90000,
      canvasWidth: 600,
      canvasHeight: 500,
    },
    {
      stageId: 'live-route-stage-2',
      nodeIntervalMs: 2500,
      totalNodes: 12,
      timeLimitMs: 75000,
      canvasWidth: 600,
      canvasHeight: 500,
    },
    {
      stageId: 'live-route-stage-3',
      nodeIntervalMs: 2000,
      totalNodes: 15,
      timeLimitMs: 60000,
      canvasWidth: 700,
      canvasHeight: 600,
    },
    {
      stageId: 'live-route-stage-4',
      nodeIntervalMs: 1500,
      totalNodes: 18,
      timeLimitMs: 50000,
      canvasWidth: 700,
      canvasHeight: 600,
    },
    {
      stageId: 'live-route-stage-5',
      nodeIntervalMs: 1200,
      totalNodes: 20,
      timeLimitMs: 45000,
      canvasWidth: 800,
      canvasHeight: 700,
    },
];

async function main() {
  console.log('Seeding Configuration...');

  for (const stage of stages) {
    await prisma.configuration.upsert({
      where: { stageId: stage.stageId },
      update: stage,
      create: stage,
    });
  }

  console.log(`Seeded ${stages.length} stage configurations.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
