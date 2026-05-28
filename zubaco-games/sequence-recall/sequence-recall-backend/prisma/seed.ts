import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const STAGE_ID = "03a47877-db2a-47e6-8661-2187342563ff";

function createPrismaClient(): PrismaClient {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  const pool = new Pool({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    database: decodeURIComponent(dbUrl.pathname.slice(1)),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    await prisma.gameConfiguration.upsert({
      where: { stageId: STAGE_ID },
      update: {},
      create: {
        stageId: STAGE_ID,
        cellCount: 4,
        timeLimit: 180,
        minSequence: 1,
        maxSequence: 5,
        enableDemo: true,
        demoMinSequence: 0,
        demoMaxSequence: 0,
        flashDelay: 500,
        bonusTimeRatio: 1.0,
        scorePerClick: 20,
        wrongMoveHandling: 4,
      },
    });

    console.log("Seeded GameConfiguration for stageId:", STAGE_ID);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
