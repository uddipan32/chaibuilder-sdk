import type { DbInstance, ChaiDbSetup } from "~/db/core";
import * as coreSchema from "~/drizzle/schema.sqlite";

const STUB_DRIZZLE = {} as DbInstance;

/** Unit tests: avoids opening a real DB when calling `buildChaiBuilderConfig` (do not query through Chai `db`). */
export function stubChaiDbSetup(): ChaiDbSetup {
  return { drizzle: STUB_DRIZZLE, schema: coreSchema };
}

/** @deprecated Use {@link stubChaiDbSetup} */
export function stubChaiDbConfig(): ChaiDbSetup {
  return stubChaiDbSetup();
}
