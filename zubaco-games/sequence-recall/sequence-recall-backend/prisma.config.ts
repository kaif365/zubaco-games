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
      const u = new URL(process.env.DATABASE_URL!);
      u.searchParams.delete("channel_binding");
      u.searchParams.delete("sslmode");
      return u.toString();
    })(),
  },
});