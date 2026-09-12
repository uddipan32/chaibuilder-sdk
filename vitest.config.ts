import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "node_modules/.vite",
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest-setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "src/docs/**",
      ".agents/**",
      "**/tsup.config.ts",
      "**/vitest.config.ts",
      "**/drizzle.config.test.ts",
      "**/*.integration.test.ts",
    ],
    includeSource: ["src/**/*.{ts,tsx}"],
    pool: "forks",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
