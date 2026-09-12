import { afterEach, beforeEach } from "vitest";
import { createBetterSqliteDB } from "~/db/better-sqlite3";
import * as coreSchema from "~/drizzle/schema.sqlite";
import { buildChaiBuilderConfig } from "~/server/build-config";
import { resetExternalMocks } from "./mock-externals";
import { getTestDb } from "./test-db";
import { cleanupTestData } from "./transaction-manager";

// Vitest globalSetup runs in the runner process; tests execute in fork workers with a fresh module
// graph. Wire the shared test Drizzle instance into ChaiBuilder's singleton in every worker.
// The OSS package ships core tables only; plugins contribute their own schema
// fragments when registered.
buildChaiBuilderConfig({
  db: createBetterSqliteDB({ drizzle: getTestDb(), schema: coreSchema }),
  plugins: [],
});

beforeEach(() => {
  resetExternalMocks();
});

afterEach(async () => {
  const db = getTestDb();
  await cleanupTestData(db);
});
