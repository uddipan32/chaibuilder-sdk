import "~/server/only-server";
import { registerDb } from "~/db/core";
import { syncBlockDataProvidersToRegistry } from "~/server/defaults/block-data-providers";
import { setActiveChaiBuilderConfig } from "~/server/defaults/config-registry";
import { editionServerPlugins } from "~/edition/builtin-server-plugins";
import { registerChaiRequestMiddleware } from "~/server/plugin-api/request-middleware";
import type { ChaiSchemaFragment } from "~/types/plugin";
import { setChaiContextResolver } from "./chai-context-resolver";
import {
  resolveChaiBuilderConfig,
  type ChaiBuilderServerConfigInput,
  type ResolvedChaiBuilderServerConfig,
} from "./defaults";

type ChaiBuilderConfigOnInit = (config: Readonly<ResolvedChaiBuilderServerConfig>) => void | Promise<void>;

const onInitByConfig = new WeakMap<ResolvedChaiBuilderServerConfig, ChaiBuilderConfigOnInit>();

/**
 * Returns the `onInit` callback registered via {@link buildChaiBuilderConfig}, if any.
 * For ChaiBuilder SDK internal use.
 */
export function getChaiBuilderConfigOnInit(
  config: ResolvedChaiBuilderServerConfig,
): ChaiBuilderConfigOnInit | undefined {
  return onInitByConfig.get(config);
}

export type BuildChaiBuilderConfigOptions<TExtra extends Record<string, unknown> = Record<never, never>> = {
  /**
   * Runs once on the first `getChaiBuilder` call for this process.
   */
  onInit?: (config: Readonly<ResolvedChaiBuilderServerConfig>) => void | Promise<void>;
  /**
   * Arbitrary user-defined config merged into the returned config object.
   * Access via `cb.getConfig(key)` on the ChaiBuilder instance.
   */
  extend?: TExtra;
};

/**
 * Build ChaiBuilder server configuration with SDK defaults merged in.
 */
export function buildChaiBuilderConfig<TExtra extends Record<string, unknown> = Record<never, never>>(
  config: ChaiBuilderServerConfigInput,
  options?: BuildChaiBuilderConfigOptions<TExtra>,
): Readonly<ResolvedChaiBuilderServerConfig & TExtra> {
  // Edition-level always-on plugins run first so app/plugin config still gets
  // the last word on everything else they touch.
  const resolved = resolveChaiBuilderConfig({
    ...config,
    plugins: [...editionServerPlugins(), ...(config.plugins ?? [])],
  });
  const extended = { ...resolved, ...(options?.extend ?? {}) } as ResolvedChaiBuilderServerConfig & TExtra;
  extended.db = withPluginSchema(extended.db, extended.schemaFragments);
  registerDb(extended.db);
  setActiveChaiBuilderConfig(extended);
  syncBlockDataProvidersToRegistry(extended.blockDataProviders);
  registerPluginRuntime(extended);
  if (options?.onInit) {
    onInitByConfig.set(extended, options.onInit);
  }
  return Object.freeze(extended);
}

/** Merges each contributed schema fragment for the active dialect into the DB setup. */
function withPluginSchema(
  db: ResolvedChaiBuilderServerConfig["db"],
  schemaFragments: ChaiSchemaFragment[],
): ResolvedChaiBuilderServerConfig["db"] {
  const dialect = db.dialect ?? "pg";
  let schema = db.schema;
  let changed = false;
  for (const entry of schemaFragments) {
    const fragment = entry[dialect];
    if (fragment && Object.keys(fragment).length > 0) {
      schema = { ...schema, ...fragment };
      changed = true;
    }
  }
  if (!changed) {
    return db;
  }
  // Rebuild the drizzle instance over the same connection where the adapter
  // allows it, so `db.query.<pluginTable>` sees the merged schema too.
  const drizzle = db.withSchema ? db.withSchema(schema) : db.drizzle;
  return { ...db, drizzle, schema };
}

/** Registers the context resolver, request middleware, and setup callbacks the plugins contributed. */
function registerPluginRuntime(config: Readonly<ResolvedChaiBuilderServerConfig>): void {
  if (config.contextResolver) {
    // Last plugin to set it wins; a later `createChaiBuilder(config, { context })` wins over all.
    setChaiContextResolver(config.contextResolver);
  }
  for (const { name, handler } of config.requestMiddlewares) {
    registerChaiRequestMiddleware(name, handler);
  }
  for (const setup of config.setupHooks) {
    setup({ config });
  }
}
