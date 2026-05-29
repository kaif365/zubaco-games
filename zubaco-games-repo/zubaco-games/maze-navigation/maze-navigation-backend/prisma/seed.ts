import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing existing data...');
  // Clean up existing game state and configs to start fresh
  await prisma.gameMove.deleteMany();
  await prisma.cheatFlag.deleteMany();
  await prisma.gameSessionMaze.deleteMany();
  await prisma.gameSessionStageLevelConfig.deleteMany();
  await prisma.gameSessionStageConfig.deleteMany();
  await prisma.gameSession.deleteMany();
  
  await prisma.stageDemoLevelConfig.deleteMany();
  await prisma.stageLevelConfig.deleteMany();
  await prisma.stageConfig.deleteMany();
  await prisma.mazeTemplate.deleteMany();
  await prisma.mazeDifficultyConfig.deleteMany();
  await prisma.level.deleteMany();

  console.log('Seeding levels...');
  const easyLevel = await prisma.level.create({
    data: { name: 'Easy', difficulty: 'easy' }
  });
  const mediumLevel = await prisma.level.create({
    data: { name: 'Medium', difficulty: 'medium' }
  });
  const hardLevel = await prisma.level.create({
    data: { name: 'Hard', difficulty: 'hard' }
  });

  console.log('Seeding maze difficulty configs (board dimensions)...');
  await prisma.mazeDifficultyConfig.create({
    data: { levelId: easyLevel.id, rows: 15, cols: 15 } // Easy grid
  });
  await prisma.mazeDifficultyConfig.create({
    data: { levelId: mediumLevel.id, rows: 25, cols: 25 } // Medium grid
  });
  await prisma.mazeDifficultyConfig.create({
    data: { levelId: hardLevel.id, rows: 35, cols: 35 } // Hard grid
  });

  // The fixed stageId that you use when testing or connecting from infinity-loop
  const specificStageId = '8f3c2e4b-7a9d-4d6f-9c21-5b8e2f4a1d90';
  console.log(`Seeding StageConfig with ID: ${specificStageId}`);
  
  const stageConfig = await prisma.stageConfig.create({
    data: {
      stageId: specificStageId,
      timeLimit: 600, // 10 minutes total for all 5 boards
    }
  });

  console.log('Seeding StageLevelConfigs (2 Easy, 2 Medium, 1 Hard = 5 Boards total)...');
  await prisma.stageLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: easyLevel.id,
      boardCount: 2, // 2 easy boards
      order: 1
    }
  });
  
  await prisma.stageLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: mediumLevel.id,
      boardCount: 2, // 2 medium boards
      order: 2
    }
  });
  
  await prisma.stageLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: hardLevel.id,
      boardCount: 1, // 1 hard board
      order: 3
    }
  });

  console.log('Seeding StageDemoLevelConfigs (2 Easy, 1 Medium = 3 Demo Boards)...');
  await prisma.stageDemoLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: easyLevel.id,
      boardCount: 1,
      order: 1
    }
  });
  await prisma.stageDemoLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: easyLevel.id,
      boardCount: 1,
      order: 2
    }
  });
  await prisma.stageDemoLevelConfig.create({
    data: {
      stageConfigId: stageConfig.id,
      levelId: mediumLevel.id,
      boardCount: 1,
      order: 3
    }
  });

  console.log('Seeding completed successfully!');
  console.log('Created a 5-board Stage: [Easy, Easy, Medium, Medium, Hard]');
  console.log('Created Demo: [Easy, Easy, Medium]');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
