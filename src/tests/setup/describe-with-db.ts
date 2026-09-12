import { eq } from "drizzle-orm";
import { afterAll, describe } from "vitest";
import * as tables from "~/drizzle/schema.sqlite";
import { createSeeder } from "./seed-api";
import { getTestDb } from "./test-db";

type TableName = keyof typeof tables;

interface DescribeWithDBContext {
  seed: ReturnType<typeof createSeeder>["seed"];
  seedMany: ReturnType<typeof createSeeder>["seedMany"];
  seedUpdate: ReturnType<typeof createSeeder>["seedUpdate"];
}

interface TrackedRow {
  table: TableName;
  id: string;
}

export function describeWithDB(title: string, fn: (ctx: DescribeWithDBContext) => void): void {
  describe(title, () => {
    const trackedRows: TrackedRow[] = [];
    const db = getTestDb();
    const { seed: baseSeed, seedMany: baseSeedMany, seedUpdate } = createSeeder(db);

    const trackingSeed: typeof baseSeed = async (table, data) => {
      const result = await baseSeed(table, data);
      trackedRows.push({ table, id: (result as any).id });
      return result;
    };

    const trackingSeedMany: typeof baseSeedMany = async (table, rows) => {
      const results = await baseSeedMany(table, rows);
      results.forEach((result) => {
        trackedRows.push({ table, id: (result as any).id });
      });
      return results;
    };

    afterAll(async () => {
      for (const row of trackedRows.reverse()) {
        const tableDef = tables[row.table];
        if (tableDef) {
          await db.delete(tableDef).where(eq((tableDef as any).id, row.id));
        }
      }
      trackedRows.length = 0;
    });

    fn({
      seed: trackingSeed,
      seedMany: trackingSeedMany,
      seedUpdate,
    });
  });
}
