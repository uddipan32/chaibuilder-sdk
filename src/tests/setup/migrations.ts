import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, unlinkSync } from "fs";
import path from "path";
import { closeTestDb, getTestDb, getTestDbFilePath } from "./test-db";

/** Matches `out` in drizzle.config.test.ts — generated in CI via `db:test:generate`. */
const migrationsFolder = path.resolve(process.cwd(), "src/drizzle/migrations-sqlite");

function unlinkIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export async function resetDatabase(): Promise<void> {
  await closeTestDb();

  const file = getTestDbFilePath();
  if (file === ":memory:") {
    return;
  }

  unlinkIfExists(file);
  unlinkIfExists(`${file}-wal`);
  unlinkIfExists(`${file}-shm`);
  console.log("DB cleaned");
}

export async function runTestMigrations(): Promise<void> {
  try {
    await resetDatabase();
    const db = getTestDb();
    migrate(db, { migrationsFolder });
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

export { migrationsFolder };
