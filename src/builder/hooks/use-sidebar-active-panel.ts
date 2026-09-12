import { atom, useAtom } from "jotai";

export const sidebarActivePanelAtom = atom<string | null>("outline");
sidebarActivePanelAtom.debugLabel = "sidebarActivePanelAtom";

export const useSidebarActivePanel = () => {
  return useAtom(sidebarActivePanelAtom);
};

/**
 * The panel the sidebar is sliding away from while a drag swaps panels.
 *
 * Set on drag start when the drag begins inside a panel that has to make room
 * for the Outline, cleared on drag end. While it holds a panel id, the left
 * panel plays the slide-out / slide-in sequence and pins its width so the
 * canvas does not resize mid-drag.
 */
export const sidebarPanelSwapAtom = atom<string | null>(null);
sidebarPanelSwapAtom.debugLabel = "sidebarPanelSwapAtom";

export const useSidebarPanelSwap = () => {
  return useAtom(sidebarPanelSwapAtom);
};
