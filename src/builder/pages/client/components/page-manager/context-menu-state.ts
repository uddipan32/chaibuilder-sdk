import { atom } from "jotai";

interface ContextMenuState {
  pageId: string | null;
  position: { x: number; y: number };
}

export const contextMenuAtom = atom<ContextMenuState>({
  pageId: null,
  position: { x: 0, y: 0 },
});
