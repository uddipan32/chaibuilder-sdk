import type { ChaiConfigDeepPartial } from "~/types/server-config";

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge `override` into `base`. Functions in override replace base values.
 *
 * Constrained to `object` rather than `PlainObject` so interfaces qualify too: an
 * interface has no implicit index signature, and the config namespaces plugins augment
 * (`ChaiServerFeatures`, `ChaiMediaManagerConfig`) are interfaces by design.
 *
 * `override` is a *deep* partial, matching what the merge actually does — callers pass
 * things like `{ revisions: { enabled: true } }` and keep the rest of the nested defaults.
 */
export function deepMerge<T extends object>(
  base: T,
  // NoInfer so T is pinned by `base`: a partial override must never narrow the result type.
  override: ChaiConfigDeepPartial<NoInfer<T>> | undefined,
): T {
  if (!override) {
    return { ...base };
  }

  // The merge is structural, so it runs on erased types; the signature above is what callers see.
  const baseRecord = base as PlainObject;
  const overrideRecord = override as PlainObject;
  const result: PlainObject = { ...baseRecord };

  for (const key of Object.keys(overrideRecord)) {
    const overrideValue = overrideRecord[key];
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = baseRecord[key];

    if (typeof overrideValue === "function") {
      result[key] = overrideValue;
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      continue;
    }

    result[key] = overrideValue;
  }

  return result as T;
}

/**
 * Merge arrays by key. User entries win on key collision (shallow merge per item).
 */
export function mergeByKey<T>(defaults: T[], overrides: T[] | undefined, getKey: (item: T) => string): T[] {
  const map = new Map<string, T>();

  for (const item of defaults) {
    map.set(getKey(item), item);
  }

  for (const item of overrides ?? []) {
    const key = getKey(item);
    const existing = map.get(key);
    if (existing && isPlainObject(existing) && isPlainObject(item)) {
      map.set(key, { ...existing, ...item } as T);
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}
