import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv("test", rootDir, "VITE_");

const defaultTestEnv = {
  VITE_API_BASE_URL: "http://localhost:3000/api/v1",
  VITE_STAGE_ID: "00000000-0000-0000-0000-000000000001",
  VITE_STAGE_NUMBER: "1",
  VITE_STAGE_CONTENT_GAME_TYPE: "MAZE_NAVIGATION",
  VITE_ENCRYPTION_ENABLED: "false",
};
const mergedEnv = { ...defaultTestEnv, ...env };

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@app": path.resolve(rootDir, "src/app"),
    },
  },
  define: Object.fromEntries(
    Object.entries(mergedEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: mergedEnv,
    coverage: {
      provider: "v8",
    },
  },
});
