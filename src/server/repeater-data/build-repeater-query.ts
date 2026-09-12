import { get, isArray, isNil } from "lodash-es";
import { resolveBinding } from "~/render/binding-engine";
import type { ChaiBlock } from "~/types/common";
import {
  CHAI_REPEATER_DYNAMIC_VALUES,
  CHAI_REPEATER_OPERATORS_BY_TYPE,
  type ChaiRepeaterDataEntry,
  type ChaiRepeaterDataField,
  type ChaiRepeaterFilter,
  type ChaiRepeaterQuery,
  type ChaiRepeaterSort,
} from "~/types/repeater-data";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const BINDING_PATTERN = /\{\{.*\}\}/;

export type RepeaterQueryContext = {
  pageProps: { slug?: string; [key: string]: any };
  lang: string;
  /** Page external data ({{...}} filter-value bindings resolve against this). */
  externalData?: Record<string, any>;
};

const resolveDynamicValue = (value: string, ctx: RepeaterQueryContext): string | undefined => {
  switch (value) {
    case CHAI_REPEATER_DYNAMIC_VALUES.currentPageSlug:
      return ctx.pageProps?.slug;
    case CHAI_REPEATER_DYNAMIC_VALUES.currentPageBaseSlug:
      return ctx.pageProps?.pageBaseSlug ?? ctx.pageProps?.slug;
    case CHAI_REPEATER_DYNAMIC_VALUES.currentLang:
      return ctx.lang;
    default:
      return value;
  }
};

const coerceValue = (
  rawValue: unknown,
  field: ChaiRepeaterDataField,
  operator: ChaiRepeaterFilter["operator"],
  ctx: RepeaterQueryContext,
): ChaiRepeaterFilter["value"] | undefined => {
  if (isNil(rawValue)) return undefined;

  // multi-value operators take arrays, or a {{...}} binding that resolves to one
  const isMultiOperator = operator === "in" || operator === "not_in";
  if (isMultiOperator) {
    const bound =
      typeof rawValue === "string" && BINDING_PATTERN.test(rawValue)
        ? resolveBinding(rawValue, ctx.externalData ?? {}, ctx.lang)
        : rawValue;
    if (!isArray(bound)) return undefined;
    const entries = bound
      .map((entry) => resolveDynamicValue(String(entry), ctx))
      .filter((entry): entry is string => !isNil(entry) && entry !== "");
    return entries.length ? entries : undefined;
  }
  if (isArray(rawValue)) return undefined;

  switch (field.type) {
    case "number": {
      const parsed = Number(rawValue);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case "boolean":
      return rawValue === true || rawValue === "true";
    default: {
      const stringValue = String(rawValue);
      const bound = BINDING_PATTERN.test(stringValue)
        ? resolveBinding(stringValue, ctx.externalData ?? {}, ctx.lang)
        : stringValue;
      // a binding may resolve to a native non-scalar; those never match a scalar operator
      if (isNil(bound) || isArray(bound) || typeof bound === "object") return undefined;
      const resolved = resolveDynamicValue(String(bound), ctx);
      return isNil(resolved) || resolved === "" ? undefined : resolved;
    }
  }
};

/**
 * True when any of the block's stored filter values carries a `{{...}}` binding,
 * i.e. building its query needs page external data in the context.
 */
export const blockFiltersHaveBindings = (block: ChaiBlock): boolean => {
  const filters = get(block, "filters", []);
  return isArray(filters) && BINDING_PATTERN.test(JSON.stringify(filters));
};

const warnedLegacyBlocks = new Set<string>();

/**
 * A block bound to an id that used to be a legacy collection can still carry the
 * old opaque `filter`/`sort` prop values. Repeater data never interprets those —
 * only `filters`/`sortBy` — so warn once per block instead of dropping them
 * silently. The raw props stay on the block and are still handed to `fetch`.
 */
const warnOnLegacyFilterProps = (source: ChaiRepeaterDataEntry, block: ChaiBlock): void => {
  const legacyFilter = get(block, "filter", "");
  const legacySort = get(block, "sort", "");
  if (!legacyFilter && !legacySort) return;

  const blockKey = `${source.id}:${get(block, "_id", "")}`;
  if (warnedLegacyBlocks.has(blockKey)) return;
  warnedLegacyBlocks.add(blockKey);

  console.warn(
    `[chaibuilder] chaiCollections("${source.id}"): Repeater block "${get(block, "_id", "")}" still has legacy ` +
      `collection props (filter: "${legacyFilter}", sort: "${legacySort}"). Collection data ignores them — ` +
      `re-create them as filters/sortBy rows in the block settings, or read them from \`block\` inside fetch.`,
  );
};

/**
 * Build the validated query passed to a repeater-data source's `fetch` from the
 * block's stored props. Block props come from the client in the builder action,
 * so everything is read defensively: unknown/non-filterable fields, invalid
 * operators and un-coercible values are dropped; `$page.*` dynamic tokens are
 * resolved from page context; limit is clamped to the source's maxLimit.
 */
export function buildRepeaterQuery(
  source: ChaiRepeaterDataEntry,
  block: ChaiBlock,
  ctx: RepeaterQueryContext,
): ChaiRepeaterQuery {
  warnOnLegacyFilterProps(source, block);

  const fieldsById = new Map((source.fields ?? []).map((field) => [field.id, field]));

  const rawFilters = get(block, "filters", []);
  const filters: ChaiRepeaterFilter[] = (isArray(rawFilters) ? rawFilters : []).flatMap((raw) => {
    const field = fieldsById.get(raw?.field);
    if (!field || field.filterable === false) return [];
    if (!CHAI_REPEATER_OPERATORS_BY_TYPE[field.type]?.includes(raw?.operator)) return [];
    const value = coerceValue(raw?.value, field, raw.operator, ctx);
    if (value === undefined) return [];
    return [{ field: field.id, operator: raw.operator, value }];
  });

  const rawSort = get(block, "sortBy", []);
  let sort: ChaiRepeaterSort[] = (isArray(rawSort) ? rawSort : []).flatMap((raw) => {
    const field = fieldsById.get(raw?.field);
    if (!field || field.sortable === false) return [];
    if (raw?.direction !== "asc" && raw?.direction !== "desc") return [];
    return [{ field: field.id, direction: raw.direction }];
  });
  if (!sort.length) {
    sort = source.defaultSort ?? [];
  }

  const blockLimit = Number(get(block, "limit"));
  const requested = Number.isFinite(blockLimit) && blockLimit > 0 ? blockLimit : (source.defaultLimit ?? DEFAULT_LIMIT);
  const limit = Math.min(requested, source.maxLimit ?? MAX_LIMIT);

  return { filters, sort, limit };
}
