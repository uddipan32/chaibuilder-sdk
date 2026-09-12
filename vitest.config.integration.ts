import { config } from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

// Load test environment variables
config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  cacheDir: "node_modules/.vite-integration",
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./src/tests/setup/global-setup.ts"],
    setupFiles: ["./src/tests/setup/integration-setup.ts"],
    include: ["src/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ".agents/**", "pro/docs/**"],
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
