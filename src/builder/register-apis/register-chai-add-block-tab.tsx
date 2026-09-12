import { has, set, values } from "lodash-es";
import { useMemo } from "react";

export type AddBlockTab = {
  id: string;
  tab: React.ComponentType;
  tabContent: React.ComponentType;
};

// Export for testing purposes
export const ADD_BLOCK_TABS: Record<string, AddBlockTab> = {};

export const registerChaiAddBlockTab = (id: string, tab: Omit<AddBlockTab, "id">) => {
  if (has(ADD_BLOCK_TABS, id)) {
    console.warn(`Add block tab with id ${id} already registered`);
  }
  set(ADD_BLOCK_TABS, id, { id, ...tab });
};

export const useChaiAddBlockTabs = () => {
  return useMemo(() => {
    return values(ADD_BLOCK_TABS);
  }, []);
};
