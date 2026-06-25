import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new (require('@prisma/adapter-pg').PrismaPg)(new (require('pg').Pool)({ host: new URL(process.env.DATABASE_URL).hostname, port: Number(new URL(process.env.DATABASE_URL).port) || 5432, database: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)), user: decodeURIComponent(new URL(process.env.DATABASE_URL).username), password: decodeURIComponent(new URL(process.env.DATABASE_URL).password), ssl: new URL(process.env.DATABASE_URL).searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false } })) });

const stages = [
    {
      stageId: 'memory-groups-stage-1',
      showDurationMs: 8000,
      timeLimitMs: 90000,
      groupSize: 3,
      totalGroups: 2,
      pointsPerGroup: 50,
      pointsPerPartialWord: 10,
      timeBonusMultiplier: 3,
    },
    {
      stageId: 'memory-groups-stage-2',
      showDurationMs: 6000,
      timeLimitMs: 75000,
      groupSize: 3,
      totalGroups: 3,
      pointsPerGroup: 60,
      pointsPerPartialWord: 12,
      timeBonusMultiplier: 4,
    },
    {
      stageId: 'memory-groups-stage-3',
      showDurationMs: 5000,
      timeLimitMs: 60000,
      groupSize: 4,
      totalGroups: 3,
      pointsPerGroup: 75,
      pointsPerPartialWord: 15,
      timeBonusMultiplier: 5,
    },
    {
      stageId: 'memory-groups-stage-4',
      showDurationMs: 4000,
      timeLimitMs: 50000,
      groupSize: 4,
      totalGroups: 4,
      pointsPerGroup: 90,
      pointsPerPartialWord: 18,
      timeBonusMultiplier: 6,
    },
    {
      stageId: 'memory-groups-stage-5',
      showDurationMs: 3000,
      timeLimitMs: 45000,
      groupSize: 5,
      totalGroups: 4,
      pointsPerGroup: 100,
      pointsPerPartialWord: 20,
      timeBonusMultiplier: 8,
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
