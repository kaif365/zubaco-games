import { PrismaClient } from '.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Base configuration for the Colour Sorting game.
 * Level-specific difficulty params (tubeCount, colorCount, timeLimitMs, etc.)
 * are handled by src/game/engine/levelConfig.ts at runtime.
 * This record provides:
 *   - Base fallback values (used when no level param is sent)
 *   - pointsPerSortedTube & timeBonusMultiplier (used for ALL levels)
 */
const stages = [
  {
    stageId: '00000000-0000-0000-0000-000000000001',
    label: 'Colour Sorting',
    tubeCount: 5,
    colorCount: 3,
    ballsPerTube: 4,
    emptyTubes: 2,
    timeLimitMs: 120000,
    pointsPerSortedTube: 100,
    timeBonusMultiplier: 10,
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
