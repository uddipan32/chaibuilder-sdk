import type { ChaiServerPlugin } from "~/types/plugin";
import type { TestDb } from "~/tests/setup/test-db";
import type { ChaiEditionTestHarness } from "~/types/edition";

// Edition-owned (never synced): what the shared integration-test harness needs from this edition.

/** The open-source edition registers no plugins for its integration tests. */
export const editionTestServerPlugins = (): ChaiServerPlugin[] => [];

/** No edition-owned tables to clean up: the core tables are handled by the shared harness. */
export const editionTestCleanup = async (_db: TestDb): Promise<void> => {};

({ editionTestServerPlugins, editionTestCleanup }) satisfies ChaiEditionTestHarness<TestDb>;
