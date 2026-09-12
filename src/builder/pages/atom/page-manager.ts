import { atom, useAtom, useSetAtom } from "jotai";

export const pageManagerOpenAtom = atom<boolean>(false);
pageManagerOpenAtom.debugLabel = "pageManagerOpenAtom";

export const usePageManagerAtom = () => useAtom(pageManagerOpenAtom);
export const useSetPageManagerAtom = () => useSetAtom(pageManagerOpenAtom);
