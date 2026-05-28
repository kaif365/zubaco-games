import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const stages = [
    {
      stageId: 'colour-sort-stage-1',
      label: 'Easy',
      tubeCount: 5,
      colorCount: 3,
      ballsPerTube: 4,
      emptyTubes: 2,
      timeLimitMs: 120000,
      pointsPerSortedTube: 100,
      timeBonusMultiplier: 10,
    },
    {
      stageId: 'colour-sort-stage-2',
      label: 'Medium',
      tubeCount: 7,
      colorCount: 5,
      ballsPerTube: 4,
      emptyTubes: 2,
      timeLimitMs: 120000,
      pointsPerSortedTube: 150,
      timeBonusMultiplier: 12,
    },
    {
      stageId: 'colour-sort-stage-3',
      label: 'Hard',
      tubeCount: 9,
      colorCount: 7,
      ballsPerTube: 4,
      emptyTubes: 2,
      timeLimitMs: 90000,
      pointsPerSortedTube: 200,
      timeBonusMultiplier: 15,
    },
    {
      stageId: 'colour-sort-stage-4',
      label: 'Expert',
      tubeCount: 11,
      colorCount: 9,
      ballsPerTube: 4,
      emptyTubes: 2,
      timeLimitMs: 75000,
      pointsPerSortedTube: 250,
      timeBonusMultiplier: 18,
    },
    {
      stageId: 'colour-sort-stage-5',
      label: 'Master',
      tubeCount: 14,
      colorCount: 12,
      ballsPerTube: 4,
      emptyTubes: 2,
      timeLimitMs: 60000,
      pointsPerSortedTube: 300,
      timeBonusMultiplier: 20,
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
