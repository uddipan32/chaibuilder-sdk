import { find, get } from "lodash-es";
import { useMemo } from "react";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useChaiCollections } from "~/builder/hooks/use-chai-collections";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { COLLECTION_PREFIX } from "~/constants/STRINGS";
import type { ChaiRepeaterDataDefinition } from "~/types/repeater-data";

export type RepeaterSource =
  | { kind: "repeaterData"; id: string; definition: ChaiRepeaterDataDefinition }
  | { kind: "collection"; id: string }
  | { kind: null; id: null };

/**
 * Resolve the selected Repeater block's `{{#<id>}}` source. Repeater data wins
 * over a legacy collection with the same id — same precedence as the server's
 * resolveRepeaterSource.
 */
export const useRepeaterSource = (): RepeaterSource => {
  const selectedBlock = useSelectedBlock();
  const repeaterData = useChaiCollections();
  const collections = useBuilderProp("collections", []) as { id: string }[];

  return useMemo(() => {
    const repeaterItems = String(get(selectedBlock, "repeaterItems", ""));
    if (!repeaterItems.startsWith(`{{${COLLECTION_PREFIX}`)) return { kind: null, id: null };
    const id = repeaterItems.replace(/\{\{(.*)\}\}/g, "$1").replace(COLLECTION_PREFIX, "");
    const definition = find(repeaterData, { id });
    if (definition) return { kind: "repeaterData", id, definition };
    if (find(collections, { id })) return { kind: "collection", id };
    return { kind: null, id: null };
  }, [selectedBlock, repeaterData, collections]);
};
