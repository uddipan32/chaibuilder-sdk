import dotenv from "dotenv";
import { createBetterSqliteDB } from "~/db/better-sqlite3";
import type { ChaiDbSetup } from "~/db/core";
import { getTestDbFilePath } from "./test-db";

dotenv.config({ path: ".env.test" });

/** SQLite setup from `TEST_DATABASE_URL` (.env.test / CI). */
export function createTestDbSetup(): ChaiDbSetup {
  return createBetterSqliteDB({ file: getTestDbFilePath() });
}
