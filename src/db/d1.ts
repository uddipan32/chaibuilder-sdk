import { drizzle as drizzleD1, type AnyD1Database, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "~/drizzle/schema.sqlite";
import { asDbInstance, type ChaiDbSetup } from "~/db/core";
import { chaiDrizzleLogger } from "~/db/logger";

export type D1DbInput =
  | { d1: AnyD1Database; schema?: Record<string, unknown> }
  | { drizzle: DrizzleD1Database<any>; schema?: Record<string, unknown> };

export function createD1Instance(d1: AnyD1Database): DrizzleD1Database<typeof schema> {
  return drizzleD1(d1, { schema, logger: chaiDrizzleLogger });
}

function assertSingleD1Input(input: D1DbInput): void {
  const count = Number("d1" in input) + Number("drizzle" in input);
  if (count !== 1) {
    throw new Error("ChaiBuilder: createD1DB expects exactly one of `d1` or `drizzle`.");
  }
}

/** Creates a Cloudflare D1 Drizzle setup for `buildChaiBuilderConfig({ db: ... })`. */
export function createD1DB(input: D1DbInput): ChaiDbSetup {
  assertSingleD1Input(input);

  const activeSchema = input.schema ?? schema;

  if ("drizzle" in input) {
    return { drizzle: asDbInstance(input.drizzle), schema: activeSchema, dialect: "sqlite" };
  }

  return {
    drizzle: asDbInstance(drizzleD1(input.d1, { schema: activeSchema, logger: chaiDrizzleLogger })),
    schema: activeSchema,
    dialect: "sqlite",
    withSchema: (mergedSchema) =>
      asDbInstance(drizzleD1(input.d1, { schema: mergedSchema, logger: chaiDrizzleLogger })),
  };
}

export type { DrizzleD1Database };
