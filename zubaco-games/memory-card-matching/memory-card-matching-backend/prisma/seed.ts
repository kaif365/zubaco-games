import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

const DIFFICULTIES: { name: string; difficultyScore: number }[] = [
  { name: "Demo", difficultyScore: 0 },
  { name: "Easy", difficultyScore: 1 },
  { name: "Medium", difficultyScore: 2 },
  { name: "Hard", difficultyScore: 3 },
];

/**
 * Load environment variables before initializing Prisma.
 *
 * @returns {void} Resolves when environment variables have been loaded.
 */
function loadEnv(): void {
  const env = process.env.NODE_ENV || "development";
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

/**
 * Seed the base difficulty records required by the admin APIs.
 *
 * @returns {Promise<void>} Resolves when difficulty rows are ensured.
 */
async function main(): Promise<void> {
  loadEnv();

  const prisma = new PrismaClient();

  try {
    for (const { name, difficultyScore } of DIFFICULTIES) {
      const existing = await prisma.difficulty.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          deletedAt: true,
          difficultyScore: true,
        },
      });

      if (!existing) {
        await prisma.difficulty.create({
          data: { name, difficultyScore },
        });
        // eslint-disable-next-line no-console
        console.log(`Created difficulty: ${name}`);
        continue;
      }

      const needsUpdate =
        existing.deletedAt !== null ||
        existing.difficultyScore !== difficultyScore;

      if (needsUpdate) {
        await prisma.difficulty.update({
          where: { id: existing.id },
          data: { name, difficultyScore, deletedAt: null },
        });
        // eslint-disable-next-line no-console
        console.log(`Updated difficulty: ${name}`);
        continue;
      }

      // eslint-disable-next-line no-console
      console.log(`Difficulty already up to date: ${name}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to seed difficulties", error);
  process.exitCode = 1;
});
