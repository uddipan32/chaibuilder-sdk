import { drizzle as drizzleLibSql, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient, type Client as LibSqlClient } from "@libsql/client";
import * as schema from "~/drizzle/schema.sqlite";
import { asDbInstance, type ChaiDbSetup } from "~/db/core";
import { chaiDrizzleLogger } from "~/db/logger";

export type LibsqlDbInput =
  | { url: string; authToken?: string; schema?: Record<string, unknown> }
  | { drizzle: LibSQLDatabase<any>; schema?: Record<string, unknown> };

export function createLibSqlInstance(
  url: string,
  authToken?: string,
): { db: LibSQLDatabase<typeof schema>; client: LibSqlClient } {
  const client = createClient({ url, authToken });
  const db = drizzleLibSql(client, { schema, logger: chaiDrizzleLogger });
  return { db, client };
}

function assertSingleLibsqlInput(input: LibsqlDbInput): void {
  const count = Number("url" in input) + Number("drizzle" in input);
  if (count !== 1) {
    throw new Error("ChaiBuilder: createLibsqlDB expects exactly one of `url` or `drizzle`.");
  }
}

/** Creates a libSQL Drizzle setup for `buildChaiBuilderConfig({ db: ... })`. */
export function createLibsqlDB(input: LibsqlDbInput): ChaiDbSetup {
  assertSingleLibsqlInput(input);

  const activeSchema = input.schema ?? schema;

  if ("drizzle" in input) {
    return { drizzle: asDbInstance(input.drizzle), schema: activeSchema, dialect: "sqlite" };
  }

  const client = createClient({ url: input.url, authToken: input.authToken });
  const db = drizzleLibSql(client, { schema: activeSchema, logger: chaiDrizzleLogger });
  return {
    drizzle: asDbInstance(db),
    schema: activeSchema,
    dialect: "sqlite",
    withSchema: (mergedSchema) =>
      asDbInstance(drizzleLibSql(client, { schema: mergedSchema, logger: chaiDrizzleLogger })),
    teardown: () => {
      client.close();
    },
  };
}

export type { LibSqlClient, LibSQLDatabase };
