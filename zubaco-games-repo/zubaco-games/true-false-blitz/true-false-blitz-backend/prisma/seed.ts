import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'tf-blitz-stage-1',
      totalStatements: 20,
      displayTimeMs: 3000,
      timeLimitMs: 90000,
      pointsPerCorrect: 10,
      penaltyPerWrong: 3,
      streakThreshold: 3,
      streakBonus: 5,
    },
    {
      stageId: 'tf-blitz-stage-2',
      totalStatements: 25,
      displayTimeMs: 2500,
      timeLimitMs: 75000,
      pointsPerCorrect: 12,
      penaltyPerWrong: 5,
      streakThreshold: 3,
      streakBonus: 8,
    },
    {
      stageId: 'tf-blitz-stage-3',
      totalStatements: 30,
      displayTimeMs: 2000,
      timeLimitMs: 60000,
      pointsPerCorrect: 15,
      penaltyPerWrong: 5,
      streakThreshold: 4,
      streakBonus: 10,
    },
    {
      stageId: 'tf-blitz-stage-4',
      totalStatements: 35,
      displayTimeMs: 1500,
      timeLimitMs: 50000,
      pointsPerCorrect: 18,
      penaltyPerWrong: 7,
      streakThreshold: 4,
      streakBonus: 12,
    },
    {
      stageId: 'tf-blitz-stage-5',
      totalStatements: 40,
      displayTimeMs: 1200,
      timeLimitMs: 45000,
      pointsPerCorrect: 20,
      penaltyPerWrong: 8,
      streakThreshold: 5,
      streakBonus: 15,
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
