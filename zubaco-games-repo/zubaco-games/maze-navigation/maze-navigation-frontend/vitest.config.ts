import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv("test", rootDir, "VITE_");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@app": path.resolve(rootDir, "src/app"),
    },
  },
  define: Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `import.meta.env.VITE_${key}`,
      JSON.stringify(value),
    ]),
  ),
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
    },
  },
});
