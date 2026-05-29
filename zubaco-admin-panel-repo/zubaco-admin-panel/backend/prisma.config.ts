import "dotenv/config";
import { defineConfig } from "prisma/config";

const rawUrl = process.env.DATABASE_URL!;
const encodedUrl = rawUrl.replace(
  /^(postgresql:\/\/[^:]+):([^@]+)@/,
  (_, userPart, pass) => `${userPart}:${encodeURIComponent(pass)}@`,
);
const dbUrl = new URL(encodedUrl);
dbUrl.searchParams.delete('channel_binding');
const sanitizedUrl = dbUrl.toString();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: sanitizedUrl,
  },
});
