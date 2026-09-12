import { pgSchema, pgTable } from "drizzle-orm/pg-core";

/**
 * Every ChaiBuilder Postgres table — core and plugin-owned alike — is declared
 * through this factory so a deployment can park the whole schema under a named
 * Postgres schema (`CHAIBUILDER_POSTGRESS_SCHEMA`) instead of `public`.
 *
 * Plugin schema fragments live outside `~/drizzle`, so this has to be its own
 * module: importing it from `~/drizzle/schema` would drag the core table graph
 * into every fragment.
 */
const _chaiSchema = process.env.CHAIBUILDER_POSTGRESS_SCHEMA?.trim();

export const tableFactory = (_chaiSchema ? pgSchema(_chaiSchema).table : pgTable) as typeof pgTable;
