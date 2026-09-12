import { first, get, isString, startsWith } from "lodash-es";
import { useMemo } from "react";
import { usePageExternalData } from "~/builder/atoms/builder";
import { useSelectedBlockHierarchy } from "~/builder/hooks/use-selected-blockIds";
import { COLLECTION_PREFIX, REPEATER_PREFIX } from "~/constants/STRINGS";

/**
 * Resolves the repeater key + first item of repeater data for the currently selected
 * block hierarchy. Bindings picked inside a Repeater are rewritten to `$index.<field>`
 * form (see `DataBindingSelector`), so the suggestion UI needs both the key and a sample
 * item to enumerate available fields.
 */
export const useRepeaterBindingContext = () => {
  const pageExternalData = usePageExternalData();
  const hierarchy = useSelectedBlockHierarchy();

  const repeaterKey = useMemo(() => {
    if (hierarchy.length === 1) return "";
    const repeaterBlock = hierarchy.find((block) => block._type === "Repeater");
    if (!repeaterBlock) return "";
    const rawKey = get(repeaterBlock, "repeaterItems", "");
    if (!isString(rawKey) || !rawKey) return "";
    // Strip only the outer `{{ }}` wrapper (trimmed) — a greedy global replace could eat
    // too much if the value ever contained more than one brace pair.
    const key = rawKey.replace(/^\s*\{\{\s*/, "").replace(/\s*\}\}\s*$/, "");
    return `${REPEATER_PREFIX}${startsWith(key, COLLECTION_PREFIX) ? `${key}/${repeaterBlock?._id}` : key}`;
  }, [hierarchy]);

  const repeaterData = useMemo(() => {
    if (!repeaterKey) return undefined;
    return first(get(pageExternalData, repeaterKey.replace(REPEATER_PREFIX, ""), []) as any[]);
  }, [repeaterKey, pageExternalData]);

  return { repeaterKey, repeaterData };
};
