import type { ChaiClientPlugin } from "~/builder/register-apis/register-chai-plugin";
import type { ChaiServerPlugin } from "~/types/plugin";

/**
 * Contract for `src/edition/*` — the one directory that differs between the editions of
 * ChaiBuilder (`chaicore` and `chaipro`) by design and is never synced (see SYNC.md).
 *
 * Shared code reaches edition-specific facts only through these shapes, so both editions must
 * export the same names with the same types; each edition file ends in `satisfies` against
 * the matching type here.
 */
export type ChaiEditionIdentity = {
  /** npm package name, used in runtime error messages: `chaicore` or `chaipro`. */
  CHAI_PACKAGE_NAME: string;
  /** Short edition id. */
  CHAI_EDITION: "core" | "pro";
  /** Upper-case label for the console banner: `CORE` or `PRO`. */
  CHAI_EDITION_LABEL: string;
};

/** Server plugins that are always on for the edition; prepended by `buildChaiBuilderConfig`. */
export type ChaiEditionServerPlugins = {
  editionServerPlugins: () => ChaiServerPlugin[];
};

/** Client plugins that are always on for the edition; prepended by `registerChaiClientPlugins`. */
export type ChaiEditionClientPlugins = {
  editionClientPlugins: ChaiClientPlugin[];
};

/** What the shared integration-test harness (src/tests/setup) takes from the edition. */
export type ChaiEditionTestHarness<TDb> = {
  /** Server plugins registered for every integration test run. */
  editionTestServerPlugins: () => ChaiServerPlugin[];
  /** Deletes rows in edition-owned tables; runs inside the harness's FK-off cleanup window. */
  editionTestCleanup: (db: TDb) => Promise<void>;
};
