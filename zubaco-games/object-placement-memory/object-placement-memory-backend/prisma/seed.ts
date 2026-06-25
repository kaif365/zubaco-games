import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(new (require('pg').Pool)({ host: new URL(process.env.DATABASE_URL).hostname, port: Number(new URL(process.env.DATABASE_URL).port) || 5432, database: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)), user: decodeURIComponent(new URL(process.env.DATABASE_URL).username), password: decodeURIComponent(new URL(process.env.DATABASE_URL).password), ssl: new URL(process.env.DATABASE_URL).searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false } })) });

const stages = [
    {
      stageId: 'object-place-stage-1',
      gridSize: 3,
      objectCount: 4,
      memorizeTimeMs: 8000,
      recallTimeMs: 60000,
      pointsPerCorrect: 100,
      timeBonusMultiplier: 5,
    },
    {
      stageId: 'object-place-stage-2',
      gridSize: 4,
      objectCount: 6,
      memorizeTimeMs: 6000,
      recallTimeMs: 50000,
      pointsPerCorrect: 120,
      timeBonusMultiplier: 6,
    },
    {
      stageId: 'object-place-stage-3',
      gridSize: 4,
      objectCount: 8,
      memorizeTimeMs: 5000,
      recallTimeMs: 45000,
      pointsPerCorrect: 150,
      timeBonusMultiplier: 8,
    },
    {
      stageId: 'object-place-stage-4',
      gridSize: 5,
      objectCount: 10,
      memorizeTimeMs: 4000,
      recallTimeMs: 40000,
      pointsPerCorrect: 180,
      timeBonusMultiplier: 10,
    },
    {
      stageId: 'object-place-stage-5',
      gridSize: 6,
      objectCount: 12,
      memorizeTimeMs: 3000,
      recallTimeMs: 35000,
      pointsPerCorrect: 200,
      timeBonusMultiplier: 12,
    },
];

async function main() {
  console.log('Seeding GameConfiguration...');

  for (const stage of stages) {
    await prisma.gameConfiguration.upsert({
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
