import { useCallback } from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { useBlocksStoreUndoableActions } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { usePermissions } from "~/builder/hooks/use-permissions";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { ChaiBlock } from "~/types/common";
import { replaceBlock } from "~/utils/blocks-tree-ops";

export { replaceBlock };

export const useReplaceBlock = () => {
  const [, setSelectedIds] = useSelectedBlockIds();
  const { setNewBlocks } = useBlocksStoreUndoableActions();
  const { hasPermission } = usePermissions();

  return useCallback(
    (blockId: string | undefined, replacementBlocks: ChaiBlock[]) => {
      if (!hasPermission(CHAI_PERMISSIONS["pages:update"])) return;
      const latestUpdatedBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
      const newBlocks = blockId ? replaceBlock(latestUpdatedBlocks, blockId, replacementBlocks) : replacementBlocks;
      setNewBlocks(newBlocks);
      // Select the first replacement block after replace
      if (replacementBlocks.length > 0) {
        setTimeout(() => setSelectedIds([replacementBlocks[0]._id]), 200);
      }
    },
    [setSelectedIds, setNewBlocks, hasPermission],
  );
};
