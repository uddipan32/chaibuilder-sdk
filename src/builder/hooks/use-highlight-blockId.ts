import { atom, useAtom } from "jotai";

const highlightBlockIdAtom = atom<string>("");

/**
 *
 */
export const useHighlightBlockId = () => useAtom(highlightBlockIdAtom);
