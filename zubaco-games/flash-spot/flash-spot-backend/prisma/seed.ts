import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL } as any);

const stages = [
    {
      stageId: 'flash-spot-stage-1',
      timeLimit: 60000,
      gridSize: 3,
      changeCount: 8,
      changeIntervalMs: 4000,
      displayDurationMs: 2500,
      pointsPerCorrectTap: 15,
      penaltyPerWrongTap: 5,
      bonusTimeRatio: 10,
    },
    {
      stageId: 'flash-spot-stage-2',
      timeLimit: 60000,
      gridSize: 4,
      changeCount: 12,
      changeIntervalMs: 3000,
      displayDurationMs: 2000,
      pointsPerCorrectTap: 20,
      penaltyPerWrongTap: 10,
      bonusTimeRatio: 10,
    },
    {
      stageId: 'flash-spot-stage-3',
      timeLimit: 45000,
      gridSize: 5,
      changeCount: 16,
      changeIntervalMs: 2500,
      displayDurationMs: 1500,
      pointsPerCorrectTap: 25,
      penaltyPerWrongTap: 10,
      bonusTimeRatio: 12,
    },
    {
      stageId: 'flash-spot-stage-4',
      timeLimit: 45000,
      gridSize: 5,
      changeCount: 20,
      changeIntervalMs: 2000,
      displayDurationMs: 1200,
      pointsPerCorrectTap: 30,
      penaltyPerWrongTap: 15,
      bonusTimeRatio: 15,
    },
    {
      stageId: 'flash-spot-stage-5',
      timeLimit: 30000,
      gridSize: 6,
      changeCount: 24,
      changeIntervalMs: 1500,
      displayDurationMs: 1000,
      pointsPerCorrectTap: 40,
      penaltyPerWrongTap: 15,
      bonusTimeRatio: 20,
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
