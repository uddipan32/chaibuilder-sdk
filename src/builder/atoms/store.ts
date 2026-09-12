import { getDefaultStore } from "jotai";
import { ChaiBlock } from "~/types/common";
import { presentBlocksAtom } from "./blocks";

/**
 * Jotai store for global state management
 */
export const builderStore: any = getDefaultStore();

export const getCurrentBlocks = () => {
  return builderStore.get(presentBlocksAtom) as ChaiBlock[];
};
