import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'number-grid-stage-1',
      gridSize: 4,
      revealDurationMs: 2000,
      hideIntervalMs: 5000,
      timeLimitMs: 180000,
      pointsPerCorrect: 10,
      timeBonusMultiplier: 2,
    },
    {
      stageId: 'number-grid-stage-2',
      gridSize: 5,
      revealDurationMs: 1500,
      hideIntervalMs: 4000,
      timeLimitMs: 150000,
      pointsPerCorrect: 12,
      timeBonusMultiplier: 3,
    },
    {
      stageId: 'number-grid-stage-3',
      gridSize: 6,
      revealDurationMs: 1000,
      hideIntervalMs: 3000,
      timeLimitMs: 120000,
      pointsPerCorrect: 15,
      timeBonusMultiplier: 3,
    },
    {
      stageId: 'number-grid-stage-4',
      gridSize: 7,
      revealDurationMs: 800,
      hideIntervalMs: 2500,
      timeLimitMs: 100000,
      pointsPerCorrect: 18,
      timeBonusMultiplier: 4,
    },
    {
      stageId: 'number-grid-stage-5',
      gridSize: 8,
      revealDurationMs: 600,
      hideIntervalMs: 2000,
      timeLimitMs: 90000,
      pointsPerCorrect: 20,
      timeBonusMultiplier: 5,
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
