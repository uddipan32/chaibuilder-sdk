import { get, isArray, isObject } from "lodash-es";
import { useCallback, useMemo } from "react";
import { usePageExternalData } from "~/builder/atoms/builder";
import {
  compareBindingFieldNames,
  getBindingPreview,
} from "~/builder/core/components/binding-popup/binding-options";
import { useCollectionItemBindingContext } from "~/builder/hooks/use-collection-item-binding-context";
import { useRepeaterBindingContext } from "~/builder/hooks/use-repeater-binding-context";
import { STATE_CONTEXT_PREFIX } from "~/constants/STRINGS";

export { compareBindingFieldNames };

export type BindingSuggestionItem = {
  /** Full dotted path inserted into the expression, e.g. `global.title` or `$index.name`. */
  path: string;
  /** Label shown in the dropdown (leaf key). */
  label: string;
  /** Type label (`array`, `JSON`, `string`, ...). */
  type: string;
  /** Whether selecting drills into children instead of inserting a badge. */
  drillable: boolean;
  /** Truncated primitive value preview shown next to the label. */
  preview?: string;
};

const getTypeLabel = (value: any): string => {
  if (isArray(value)) return "array";
  if (value === null) return "null";
  if (isObject(value)) return "JSON";
  return typeof value;
};

const isDrillable = (value: any): boolean => isObject(value) && !isArray(value) && value !== null;

export const getBindingSuggestionItems = (rootData: Record<string, any>, rawQuery: string): BindingSuggestionItem[] => {
  const query = rawQuery ?? "";
  const lastDot = query.lastIndexOf(".");
  const parentPath = lastDot === -1 ? "" : query.slice(0, lastDot);
  const leafFilter = (lastDot === -1 ? query : query.slice(lastDot + 1)).toLowerCase();

  const parent = parentPath ? get(rootData, parentPath) : rootData;
  if (!isObject(parent) || isArray(parent)) return [];

  return Object.entries(parent as Record<string, any>)
    // Hide only per-instance internal keys (`.../blockId`) at the root; every real
    // field — including `#collection` namespaces — stays listed.
    .filter(([key]) => parentPath || !key.includes("/"))
    .filter(([key]) => (leafFilter ? key.toLowerCase().includes(leafFilter) : true))
    // objects (drillable) first, everything else alphabetical below
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const rankDiff = (isDrillable(leftValue) ? 0 : 1) - (isDrillable(rightValue) ? 0 : 1);
      if (rankDiff !== 0) return rankDiff;
      return compareBindingFieldNames(leftKey, rightKey);
    })
    .map(([key, value]) => ({
      path: parentPath ? `${parentPath}.${key}` : key,
      label: key,
      type: getTypeLabel(value),
      drillable: isDrillable(value),
      preview: getBindingPreview(value),
    }));
};

/**
 * Returns a resolver `(query) => items` for the `{{` suggestion dropdown. The query is
 * the text typed after `{{` (e.g. `global.`, `global.ti`, ``). Objects are drillable;
 * leaves insert a binding badge.
 */
export const useBindingSuggestionItems = (externalDataOverride?: Record<string, any>) => {
  const pageExternalData = usePageExternalData();
  const { repeaterKey, repeaterData } = useRepeaterBindingContext();
  const { itemData } = useCollectionItemBindingContext();

  const rootData = useMemo(() => {
    // Some surfaces (e.g. the SEO panel) provide their own data source rather than the
    // block-builder atoms — use it verbatim when given.
    if (externalDataOverride) return externalDataOverride;
    // Expose repeater fields under `$index` (and the nearest CollectionItem's found
    // item under `$item`) so picked paths are already engine-ready.
    const withRepeater = repeaterData ? { [STATE_CONTEXT_PREFIX + "index"]: repeaterData } : {};
    const withItem = itemData ? { [STATE_CONTEXT_PREFIX + "item"]: itemData } : {};
    return { ...withRepeater, ...withItem, ...pageExternalData };
  }, [externalDataOverride, pageExternalData, repeaterData, repeaterKey, itemData]);

  const getItems = useCallback(
    (rawQuery: string): BindingSuggestionItem[] => getBindingSuggestionItems(rootData, rawQuery),
    [rootData],
  );

  return { getItems, hasData: Object.keys(rootData).length > 0, rootData };
};
