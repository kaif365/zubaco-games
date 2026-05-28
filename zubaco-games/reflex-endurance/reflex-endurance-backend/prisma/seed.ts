import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'reflex-stage-1',
      timeLimitMs: 300000,
      initialSpawnIntervalMs: 1500,
      speedIncreaseEveryMs: 45000,
      speedMultiplier: 0.9,
      maxWrongTaps: 5,
    },
    {
      stageId: 'reflex-stage-2',
      timeLimitMs: 300000,
      initialSpawnIntervalMs: 1200,
      speedIncreaseEveryMs: 35000,
      speedMultiplier: 0.88,
      maxWrongTaps: 4,
    },
    {
      stageId: 'reflex-stage-3',
      timeLimitMs: 300000,
      initialSpawnIntervalMs: 1000,
      speedIncreaseEveryMs: 30000,
      speedMultiplier: 0.85,
      maxWrongTaps: 3,
    },
    {
      stageId: 'reflex-stage-4',
      timeLimitMs: 300000,
      initialSpawnIntervalMs: 800,
      speedIncreaseEveryMs: 25000,
      speedMultiplier: 0.82,
      maxWrongTaps: 2,
    },
    {
      stageId: 'reflex-stage-5',
      timeLimitMs: 300000,
      initialSpawnIntervalMs: 650,
      speedIncreaseEveryMs: 20000,
      speedMultiplier: 0.8,
      maxWrongTaps: 1,
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
