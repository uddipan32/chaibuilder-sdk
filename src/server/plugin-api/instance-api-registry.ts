/**
 * Process-wide registry of plugin-contributed ChaiBuilder instance namespaces.
 *
 * Plugins call {@link registerChaiInstanceApi} from their config reducer to hang
 * a public server API off the instance returned by `getChaiBuilder`:
 * `registerChaiInstanceApi("redirects", { getRedirect })` makes
 * `cb.redirects.getRedirect(slug)` available. Registration is keyed by
 * namespace, so re-running the reducer (rebuilds, HMR) replaces rather than
 * duplicates.
 *
 * Plugins register plain functions; `getChaiBuilder` binds each one to the
 * request context (and debug tracing) under the label `<namespace>.<fn>` when
 * it builds the instance. Core instance keys always win over a colliding
 * namespace.
 *
 * The namespace's *type* travels with the plugin via declaration merging on
 * `ChaiPluginInstanceApis` (see `~/types/chaibuilder-instance`), so
 * `cb.<namespace>` is typed exactly when the plugin is part of the program.
 */

type ChaiInstanceApiFn = (...args: any[]) => any;

/** One plugin namespace: a flat record of functions hung off `cb.<namespace>`. */
export type ChaiInstanceApi = Record<string, ChaiInstanceApiFn>;

const registeredInstanceApis = new Map<string, ChaiInstanceApi>();

// Keys that would mutate Object.prototype (or shadow it confusingly) when the
// registered APIs are later merged into plain objects on the instance.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Contributes `cb.<namespace>.*`, e.g.
 * `registerChaiInstanceApi("redirects", redirectsInstanceApi)`.
 * Re-registration under the same namespace replaces the previous set.
 *
 * Throws on empty/prototype-polluting keys and on non-function values, so a
 * bad registration fails at plugin-reduce time instead of surfacing as a
 * broken `cb.<namespace>` later.
 */
export function registerChaiInstanceApi(namespace: string, api: ChaiInstanceApi): void {
  if (!namespace || FORBIDDEN_KEYS.has(namespace)) {
    throw new Error(`registerChaiInstanceApi: invalid namespace ${JSON.stringify(namespace)}`);
  }
  const safe: ChaiInstanceApi = Object.create(null);
  for (const [key, fn] of Object.entries(api)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`registerChaiInstanceApi("${namespace}"): invalid function name ${JSON.stringify(key)}`);
    }
    if (typeof fn !== "function") {
      throw new Error(`registerChaiInstanceApi("${namespace}"): "${key}" is not a function`);
    }
    safe[key] = fn;
  }
  registeredInstanceApis.set(namespace, safe);
}

/**
 * Snapshot of every registered namespace, for `getChaiBuilder` to bind and
 * merge. Null-prototype, so iteration/merging never trips over
 * `Object.prototype` keys.
 */
export function getContributedChaiInstanceApis(): Record<string, ChaiInstanceApi> {
  const out: Record<string, ChaiInstanceApi> = Object.create(null);
  for (const [namespace, api] of registeredInstanceApis) {
    out[namespace] = api;
  }
  return out;
}

export function resetChaiInstanceApisForTests(): void {
  registeredInstanceApis.clear();
}
