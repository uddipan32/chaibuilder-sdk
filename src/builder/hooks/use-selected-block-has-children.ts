import { atom, useAtomValue } from "jotai";
import { blockChildrenMapAtom } from "~/builder/atoms/blocks";
import { selectedBlockIdsAtom } from "~/builder/hooks/use-selected-blockIds";

// blockChildrenMapAtom is identity-stable across prop-only edits, so this stays off
// the per-keystroke path a presentBlocksAtom scan would sit on.
const selectedBlockHasChildrenAtom = atom<boolean>((get) => {
  const blockIds = get(selectedBlockIdsAtom);
  // Settings only render for a single selection.
  const blockId = blockIds.length === 1 ? blockIds[0] : null;
  if (!blockId) return false;
  return (get(blockChildrenMapAtom).get(blockId)?.length ?? 0) > 0;
});
selectedBlockHasChildrenAtom.debugLabel = "selectedBlockHasChildrenAtom";

/**
 * True when the selected block has at least one child block. Blocks that render
 * `children` instead of a prop (see `childrenOverrideProps`) use this to hide
 * the props that no longer reach the page.
 */
export const useSelectedBlockHasChildren = () => useAtomValue(selectedBlockHasChildrenAtom);
