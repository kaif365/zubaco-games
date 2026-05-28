import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'word-unscramble-stage-1',
      totalWords: 10,
      wordTimeMs: 10000,
      timeLimitMs: 120000,
      pointsPerWord: 10,
      timeBonusPerSecond: 1,
    },
    {
      stageId: 'word-unscramble-stage-2',
      totalWords: 12,
      wordTimeMs: 8000,
      timeLimitMs: 100000,
      pointsPerWord: 12,
      timeBonusPerSecond: 1,
    },
    {
      stageId: 'word-unscramble-stage-3',
      totalWords: 15,
      wordTimeMs: 6000,
      timeLimitMs: 90000,
      pointsPerWord: 15,
      timeBonusPerSecond: 2,
    },
    {
      stageId: 'word-unscramble-stage-4',
      totalWords: 18,
      wordTimeMs: 5000,
      timeLimitMs: 75000,
      pointsPerWord: 18,
      timeBonusPerSecond: 2,
    },
    {
      stageId: 'word-unscramble-stage-5',
      totalWords: 20,
      wordTimeMs: 4000,
      timeLimitMs: 60000,
      pointsPerWord: 20,
      timeBonusPerSecond: 3,
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
