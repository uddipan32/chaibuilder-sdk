import { useAtom } from "jotai";
import { selectedLibraryAtom } from "~/builder/atoms/ui";

/**
 * Hook to get and set the selected UI library
 * @returns {[string, (library: string) => void]} A tuple containing the selected library ID and a function to set the selected library
 */

export const useSelectedLibrary = () => {
  return useAtom(selectedLibraryAtom);
};
