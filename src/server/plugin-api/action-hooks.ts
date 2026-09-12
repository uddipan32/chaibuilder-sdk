import type { RoutingSlugUpdate } from "~/server/chai-builder/public/page-routing-cache";

/**
 * Process-global server action hooks. Core actions announce lifecycle events
 * (e.g. `"page:slug-changed"`) and plugins subscribe without core importing
 * plugin code. Handlers are keyed per hook so repeated registration from
 * separate module graphs replaces rather than duplicates.
 *
 * Handlers may return cache tags; `runChaiActionHooks` aggregates them so the
 * firing action can include plugin-owned tags in its mutation response.
 */

export type ChaiActionHookArgs = {
  /** Live page slugs moved; old URLs 404 until whoever cares (redirects) reacts. */
  "page:slug-changed": { appId: string; slugUpdates: RoutingSlugUpdate[]; userId?: string | null };
  /** A page now owns this path (created or renamed onto it). */
  "page:path-claimed": { appId: string; slug: string };
};

export type ChaiActionHookName = keyof ChaiActionHookArgs;

type HookHandler<N extends ChaiActionHookName> = (args: ChaiActionHookArgs[N]) => void | string[] | Promise<void | string[]>;

const _g = globalThis as typeof globalThis & {
  __chaiActionHooks?: Map<string, Map<string, HookHandler<any>>>;
};

function getRegistry(): Map<string, Map<string, HookHandler<any>>> {
  if (!_g.__chaiActionHooks) {
    _g.__chaiActionHooks = new Map();
  }
  return _g.__chaiActionHooks;
}

export function registerChaiActionHook<N extends ChaiActionHookName>(
  hook: N,
  key: string,
  handler: HookHandler<N>,
): void {
  const registry = getRegistry();
  if (!registry.has(hook)) {
    registry.set(hook, new Map());
  }
  registry.get(hook)!.set(key, handler);
}

/**
 * Runs all handlers for a hook and returns their aggregated cache tags.
 * A failing handler is logged and skipped — hook work must never block the
 * action that fired it.
 */
export async function runChaiActionHooks<N extends ChaiActionHookName>(
  hook: N,
  args: ChaiActionHookArgs[N],
): Promise<string[]> {
  const handlers = getRegistry().get(hook);
  if (!handlers) return [];
  const tags: string[] = [];
  for (const [key, handler] of handlers) {
    try {
      const result = await handler(args);
      if (Array.isArray(result)) {
        tags.push(...result);
      }
    } catch (error) {
      console.error(`ChaiBuilder: action hook "${hook}" handler "${key}" failed:`, error);
    }
  }
  return tags;
}

/** @internal Clears registered hooks between unit tests. */
export function resetChaiActionHooksForTests(): void {
  _g.__chaiActionHooks = undefined;
}
