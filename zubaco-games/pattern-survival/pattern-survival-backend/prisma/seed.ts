import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(new (require('pg').Pool)({ host: new URL(process.env.DATABASE_URL).hostname, port: Number(new URL(process.env.DATABASE_URL).port) || 5432, database: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)), user: decodeURIComponent(new URL(process.env.DATABASE_URL).username), password: decodeURIComponent(new URL(process.env.DATABASE_URL).password), ssl: new URL(process.env.DATABASE_URL).searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false } })) });

const stages = [
    {
      stageId: 'pattern-stage-1',
      gridSize: 3,
      timeLimitMs: 300000,
      flashDurationMs: 800,
      pointsPerRound: 15,
      perfectBonus: 10,
    },
    {
      stageId: 'pattern-stage-2',
      gridSize: 3,
      timeLimitMs: 300000,
      flashDurationMs: 600,
      pointsPerRound: 20,
      perfectBonus: 12,
    },
    {
      stageId: 'pattern-stage-3',
      gridSize: 4,
      timeLimitMs: 300000,
      flashDurationMs: 500,
      pointsPerRound: 25,
      perfectBonus: 15,
    },
    {
      stageId: 'pattern-stage-4',
      gridSize: 4,
      timeLimitMs: 300000,
      flashDurationMs: 400,
      pointsPerRound: 30,
      perfectBonus: 18,
    },
    {
      stageId: 'pattern-stage-5',
      gridSize: 5,
      timeLimitMs: 300000,
      flashDurationMs: 300,
      pointsPerRound: 35,
      perfectBonus: 20,
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
