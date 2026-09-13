import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.test", override: true });

const url = process.env.TEST_DATABASE_URL!;

if (!url) {
  throw new Error("TEST_DATABASE_URL is not set in .env.test");
}

export default defineConfig({
  // Edition-specific schema barrel (core tables only in chaicore, the full union in chaipro).
  schema: "./src/edition/test-schema.ts",
  out: "./src/drizzle/migrations-sqlite",
  dialect: "sqlite",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
