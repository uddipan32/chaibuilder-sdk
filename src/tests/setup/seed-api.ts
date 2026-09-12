import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import * as tables from "~/drizzle/schema.sqlite";
import { fake } from "./fakers";
import { type TestDb } from "./test-db";

type TableName = keyof typeof tables;
type SeedFn = <T extends TableName>(
  table: T,
  data?: Partial<InferInsertModel<(typeof tables)[T]>>,
) => Promise<InferSelectModel<(typeof tables)[T]>>;

type SeedManyFn = <T extends TableName>(
  table: T,
  rows: Partial<InferInsertModel<(typeof tables)[T]>>[],
) => Promise<InferSelectModel<(typeof tables)[T]>[]>;

type SeedUpdateFn = <T extends TableName>(
  table: T,
  where: Partial<InferSelectModel<(typeof tables)[T]>>,
  data: Partial<InferInsertModel<(typeof tables)[T]>>,
) => Promise<InferSelectModel<(typeof tables)[T]>[]>;

export function createSeeder(db: TestDb): {
  seed: SeedFn;
  seedMany: SeedManyFn;
  seedUpdate: SeedUpdateFn;
} {
  const seed: SeedFn = async (table, data = {}) => {
    const tableDef = tables[table];
    if (!tableDef) {
      throw new Error(`Table ${String(table)} not found in schema`);
    }

    const fakeData = (fake as any)[table]?.(data) ?? data;
    const result = await db.insert(tableDef).values(fakeData).returning();
    return result[0] as any;
  };

  const seedMany: SeedManyFn = async (table, rows) => {
    const tableDef = tables[table];
    if (!tableDef) {
      throw new Error(`Table ${String(table)} not found in schema`);
    }

    const fakeRows = rows.map((row) => (fake as any)[table]?.(row) ?? row);
    const result = await db.insert(tableDef).values(fakeRows).returning();
    return result as any;
  };

  const seedUpdate: SeedUpdateFn = async (table, where, data) => {
    const tableDef = tables[table];
    if (!tableDef) {
      throw new Error(`Table ${String(table)} not found in schema`);
    }

    const whereConditions = Object.entries(where).map(([key, value]) => {
      const column = (tableDef as any)[key];
      if (!column) {
        throw new Error(`Column ${key} not found in table ${String(table)}`);
      }
      return eq(column, value);
    });

    const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);
    const result = await db
      .update(tableDef)
      .set(data as any)
      .where(whereClause!)
      .returning();
    return result as any;
  };

  return { seed, seedMany, seedUpdate };
}
