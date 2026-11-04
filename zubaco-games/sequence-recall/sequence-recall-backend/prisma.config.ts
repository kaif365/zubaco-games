import * as dotenv from "dotenv";
import * as path from "path";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun ./prisma/seed.ts",
  },
  datasource: {
    url: (() => {
      const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sequence_recall?schema=public";
      try {
        const u = new URL(dbUrl);
        u.searchParams.delete("channel_binding");
        u.searchParams.delete("sslmode");
        return u.toString();
      } catch {
        return dbUrl;
      }
    })(),
  },
});