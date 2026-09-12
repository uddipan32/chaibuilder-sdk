import { atom, useAtom } from "jotai";

export const isPageLoadedAtom = atom<boolean>(false);

// * Hook to identify if the builder is ready
export const useIsPageLoaded = () => {
  return useAtom(isPageLoadedAtom);
};
