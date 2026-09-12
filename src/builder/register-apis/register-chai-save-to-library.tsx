import { ComponentType } from "react";
import { ChaiBlock } from "~/types/common";

export type SaveToLibraryProps = {
  blockId: string;
  blocks: ChaiBlock[];
  close: () => void;
};

let SAVE_TO_LIB_COMPONENT: ComponentType<SaveToLibraryProps> | null = null;

export const registerChaiSaveToLibrary = (component: ComponentType<SaveToLibraryProps>) => {
  SAVE_TO_LIB_COMPONENT = component;
};

export const useSaveToLibraryComponent = () => {
  // Read on every render: registration happens at runtime, after modules evaluate
  return SAVE_TO_LIB_COMPONENT;
};

// For testing purposes
export const resetSaveToLibrary = () => {
  SAVE_TO_LIB_COMPONENT = null;
};

export { SAVE_TO_LIB_COMPONENT };
