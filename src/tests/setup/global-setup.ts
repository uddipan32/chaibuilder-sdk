import { sql } from "drizzle-orm";
import { resetDbForTests } from "~/server/chai-actions/db";
import { deleteGlobalApp, getGlobalAppId, insertGlobalApp } from "./global-test-app";
import { runTestMigrations } from "./migrations";
import { closeTestDb, getTestDb, schema } from "./test-db";

export const TEST_USER_ID = "test-user-global";

export default async function globalSetup() {
  console.log("Setting up integration tests...");
  await runTestMigrations();
  const testDb = getTestDb();
  const app = await insertGlobalApp(testDb);

  console.log(`Integration test setup complete. Global app ID: ${app.id}`);

  return async () => {
    console.log("Cleaning up integration tests...");
    const db = getTestDb();
    const globalAppId = getGlobalAppId();

    db.run(sql`PRAGMA foreign_keys = OFF`);
    await db.delete(schema.appPagesOnline);
    await db.delete(schema.appPages);
    await db.delete(schema.appAssets);
    db.run(sql`PRAGMA foreign_keys = ON`);

    await deleteGlobalApp(db, globalAppId);
    resetDbForTests();
    await closeTestDb();
    console.log("Integration test cleanup complete");
  };
}
