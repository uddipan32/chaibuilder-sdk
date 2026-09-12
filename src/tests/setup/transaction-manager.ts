import { sql } from "drizzle-orm";
import { editionTestCleanup } from "~/edition/test-harness";
import type { ChaiBaseAction } from "~/server/chai-actions/base-action";
import type { ChaiActionContext } from "~/types";
import { getGlobalAppId } from "./global-test-app";
import { createSeeder } from "./seed-api";
import { getTestDb, schema, type TestDb } from "./test-db";

type ActionConstructor<T extends ChaiBaseAction<any, any>> = new () => T;

interface WithTestDBContext {
  db: TestDb;
  seed: ReturnType<typeof createSeeder>["seed"];
  seedMany: ReturnType<typeof createSeeder>["seedMany"];
  seedUpdate: ReturnType<typeof createSeeder>["seedUpdate"];
  action: <T extends ChaiBaseAction<any, any>>(
    ActionClass: ActionConstructor<T>,
    contextOverride?: Partial<ChaiActionContext>,
  ) => T;
}

export async function withTestDB<T>(testFn: (ctx: WithTestDBContext) => Promise<T>): Promise<T> {
  const db = getTestDb();

  const baseSeeder = createSeeder(db);
  const { seed, seedMany, seedUpdate } = baseSeeder;

  const action = <A extends ChaiBaseAction<any, any>>(
    ActionClass: ActionConstructor<A>,
    contextOverride: Partial<ChaiActionContext> = {},
  ): A => {
    const instance = new ActionClass();
    const context: ChaiActionContext = {
      appId: getGlobalAppId(),
      userId: "test-user-global",
      ...contextOverride,
    };
    instance.setContext(context);
    return instance;
  };

  const result = await testFn({
    db,
    seed,
    seedMany,
    seedUpdate,
    action,
  });

  return result;
}

export async function cleanupTestData(db: TestDb): Promise<void> {
  // Core tables, then whatever edition-owned tables shared actions write into (see
  // src/edition/test-harness.ts). FK checks stay off for the whole window.
  db.run(sql`PRAGMA foreign_keys = OFF`);
  await db.delete(schema.appPagesOnline);
  await db.delete(schema.appPages);
  await db.delete(schema.appAssets);
  await editionTestCleanup(db);
  db.run(sql`PRAGMA foreign_keys = ON`);
}
