import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'rapid-sort-stage-1',
      label: 'Easy',
      totalItems: 20,
      itemIntervalMs: 2500,
      itemVisibleMs: 2500,
      timeLimitMs: 90000,
      pointsPerCorrect: 10,
      penaltyPerWrong: 3,
      categoryPoolSize: 2,
    },
    {
      stageId: 'rapid-sort-stage-2',
      label: 'Medium',
      totalItems: 25,
      itemIntervalMs: 2000,
      itemVisibleMs: 2000,
      timeLimitMs: 75000,
      pointsPerCorrect: 12,
      penaltyPerWrong: 5,
      categoryPoolSize: 3,
    },
    {
      stageId: 'rapid-sort-stage-3',
      label: 'Hard',
      totalItems: 30,
      itemIntervalMs: 1500,
      itemVisibleMs: 1500,
      timeLimitMs: 60000,
      pointsPerCorrect: 15,
      penaltyPerWrong: 5,
      categoryPoolSize: 3,
    },
    {
      stageId: 'rapid-sort-stage-4',
      label: 'Expert',
      totalItems: 35,
      itemIntervalMs: 1200,
      itemVisibleMs: 1200,
      timeLimitMs: 50000,
      pointsPerCorrect: 18,
      penaltyPerWrong: 7,
      categoryPoolSize: 4,
    },
    {
      stageId: 'rapid-sort-stage-5',
      label: 'Master',
      totalItems: 40,
      itemIntervalMs: 1000,
      itemVisibleMs: 1000,
      timeLimitMs: 45000,
      pointsPerCorrect: 20,
      penaltyPerWrong: 8,
      categoryPoolSize: 4,
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
