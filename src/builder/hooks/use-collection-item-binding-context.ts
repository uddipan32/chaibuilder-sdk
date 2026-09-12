import { first, get, isString, startsWith } from "lodash-es";
import { useMemo } from "react";
import { usePageExternalData } from "~/builder/atoms/builder";
import { useSelectedBlockHierarchy } from "~/builder/hooks/use-selected-blockIds";
import { COLLECTION_PREFIX } from "~/constants/STRINGS";

/**
 * Resolves the found item of the nearest CollectionItem ancestor for the currently
 * selected block hierarchy. Bindings against it use the `$item.<field>` form, so the
 * suggestion UI needs the sample item to enumerate available fields.
 */
export const useCollectionItemBindingContext = () => {
  const pageExternalData = usePageExternalData();
  const hierarchy = useSelectedBlockHierarchy();

  const itemPath = useMemo(() => {
    const collectionItemBlock = hierarchy.find((block) => block._type === "CollectionItem");
    if (!collectionItemBlock) return "";
    const rawKey = get(collectionItemBlock, "repeaterItems", "");
    if (!isString(rawKey) || !rawKey) return "";
    // Strip only the outer `{{ }}` wrapper (trimmed) — a greedy global replace could eat
    // too much if the value ever contained more than one brace pair.
    const key = rawKey.replace(/^\s*\{\{\s*/, "").replace(/\s*\}\}\s*$/, "");
    return startsWith(key, COLLECTION_PREFIX) ? `${key}/${collectionItemBlock._id}` : key;
  }, [hierarchy]);

  const itemData = useMemo(() => {
    if (!itemPath) return undefined;
    return first(get(pageExternalData, itemPath, []) as any[]);
  }, [itemPath, pageExternalData]);

  return { itemPath, itemData };
};
