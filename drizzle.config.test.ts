import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.test", override: true });

const url = process.env.TEST_DATABASE_URL!;

if (!url) {
  throw new Error("TEST_DATABASE_URL is not set in .env.test");
}

export default defineConfig({
  schema: "./src/drizzle/schema.sqlite.ts",
  out: "./src/drizzle/migrations-sqlite",
  dialect: "sqlite",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
