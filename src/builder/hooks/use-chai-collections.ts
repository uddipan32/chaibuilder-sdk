import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import type { ChaiRepeaterDataDefinition } from "~/types/repeater-data";

const EMPTY: ChaiRepeaterDataDefinition[] = [];

/**
 * Collection data definitions passed to the editor.
 *
 * Reads the `chaiCollections` prop and falls back to the deprecated
 * `repeaterData` prop, so a host that has not migrated yet keeps working.
 */
export const useChaiCollections = (): ChaiRepeaterDataDefinition[] => {
  const chaiCollections = useBuilderProp<ChaiRepeaterDataDefinition[]>("chaiCollections", EMPTY);
  const repeaterData = useBuilderProp<ChaiRepeaterDataDefinition[]>("repeaterData", EMPTY);
  return chaiCollections.length > 0 ? chaiCollections : repeaterData;
};
