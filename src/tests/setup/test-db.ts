import Database from "better-sqlite3";
import dotenv from "dotenv";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import * as schema from "~/drizzle/schema.sqlite";

dotenv.config({ path: ".env.test" });

export type TestDb = BetterSQLite3Database<typeof schema>;

let testDbInstance: TestDb | null = null;
let testClient: Database.Database | null = null;

/** Resolve `TEST_DATABASE_URL` (`file:…`, bare path, or `:memory:`) to a better-sqlite3 path. */
export function getTestDbFilePath(): string {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw?.trim()) {
    throw new Error("Test database not configured. Please set TEST_DATABASE_URL environment variable.");
  }

  let path = raw.trim().replace(/^"|"$/g, "");
  if (path.startsWith("file:")) {
    path = path.slice("file:".length);
  }

  if (path === ":memory:") {
    return path;
  }

  // File DB required across vitest globalSetup + fork workers.
  return resolve(process.cwd(), path);
}

export function getTestDb(): TestDb {
  if (testDbInstance) {
    return testDbInstance;
  }

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test database can only be used in test environment. NODE_ENV must be 'test'.");
  }

  const file = getTestDbFilePath();
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  testClient = new Database(file);
  testClient.pragma("journal_mode = WAL");
  testClient.pragma("foreign_keys = ON");
  testDbInstance = drizzle(testClient, { schema });

  return testDbInstance;
}

export async function closeTestDb(): Promise<void> {
  if (testClient) {
    testClient.close();
    testClient = null;
    testDbInstance = null;
  }
}

export { schema };
