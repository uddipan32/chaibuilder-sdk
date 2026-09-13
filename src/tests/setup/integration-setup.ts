import { afterEach, beforeEach } from "vitest";
import { createBetterSqliteDB } from "~/db/better-sqlite3";
import { editionTestServerPlugins } from "~/edition/test-harness";
import * as schema from "~/edition/test-schema";
import { buildChaiBuilderConfig } from "~/server/build-config";
import { resetExternalMocks } from "./mock-externals";
import { getTestDb } from "./test-db";
import { cleanupTestData } from "./transaction-manager";

// Vitest globalSetup runs in the runner process; tests execute in fork workers with a fresh module
// graph. Wire the shared test Drizzle instance into ChaiBuilder's singleton in every worker.
// The schema and the plugin list are edition-specific (see src/edition/README.md): the OSS
// edition runs core tables with no plugins, the pro edition the full union with its plugins.
buildChaiBuilderConfig({
  db: createBetterSqliteDB({ drizzle: getTestDb(), schema }),
  plugins: editionTestServerPlugins(),
});

beforeEach(() => {
  resetExternalMocks();
});

afterEach(async () => {
  const db = getTestDb();
  await cleanupTestData(db);
});
