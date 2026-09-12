import Database from "better-sqlite3";
import { drizzle as drizzleBetterSqlite3, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/drizzle/schema.sqlite";
import { asDbInstance, type ChaiDbSetup } from "~/db/core";
import { chaiDrizzleLogger } from "~/db/logger";

export type BetterSqliteDbInput =
  | { file: string; schema?: Record<string, unknown> }
  | { drizzle: BetterSQLite3Database<any>; schema?: Record<string, unknown> };

function assertSingleBetterSqliteInput(input: BetterSqliteDbInput): void {
  const count = Number("file" in input) + Number("drizzle" in input);
  if (count !== 1) {
    throw new Error("ChaiBuilder: createBetterSqliteDB expects exactly one of `file` or `drizzle`.");
  }
}

/** Creates a better-sqlite3 Drizzle setup for `buildChaiBuilderConfig({ db: ... })`. */
export function createBetterSqliteDB(input: BetterSqliteDbInput): ChaiDbSetup {
  assertSingleBetterSqliteInput(input);

  const activeSchema = input.schema ?? schema;

  if ("drizzle" in input) {
    return { drizzle: asDbInstance(input.drizzle), schema: activeSchema, dialect: "sqlite" };
  }

  const sqlite = new Database(input.file);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzleBetterSqlite3(sqlite, { schema: activeSchema, logger: chaiDrizzleLogger });

  return {
    drizzle: asDbInstance(db),
    schema: activeSchema,
    dialect: "sqlite",
    withSchema: (mergedSchema) =>
      asDbInstance(drizzleBetterSqlite3(sqlite, { schema: mergedSchema, logger: chaiDrizzleLogger })),
    teardown: () => {
      sqlite.close();
    },
  };
}

export type { BetterSQLite3Database };
