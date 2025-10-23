import { presentBlocksAtom } from "@/core/atoms/blocks";
import { canAcceptChildBlock } from "@/core/functions/block-helpers";
import { useBlocksStore, useBlocksStoreUndoableActions } from "@/core/history/use-blocks-store-undoable-actions";
import { useCutBlockIds } from "@/core/hooks/use-cut-blockIds";
import { useAtomValue } from "jotai";
import { find, first, has, isEmpty } from "lodash-es";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAddBlock } from "./use-add-block";

const useCanPaste = () => {
  const [blocks] = useBlocksStore();
  return (ids: string[], newParentId: string | null) => {
    const newParentType = find(blocks, { _id: newParentId })?._type || null;
    const blockType = first(ids.map((id) => find(blocks, { _id: id })?._type));
    return canAcceptChildBlock(newParentType, blockType);
  };
};

const useMoveCutBlocks = () => {
  const presentBlocks = useAtomValue(presentBlocksAtom);
  const { moveBlocks } = useBlocksStoreUndoableActions();

  return useCallback(
    (blockIds: Array<string>, newParentId: string[] | string) => {
      const parentId = Array.isArray(newParentId) ? newParentId[0] : newParentId;
      if (newParentId === "root") {
        const newParentBlock = presentBlocks?.filter((block) => !block._parent);
        moveBlocks(blockIds, null, newParentBlock?.length || 0);
      } else {
        const newParentBlock = presentBlocks?.filter((block) => block._parent === parentId);
        moveBlocks(blockIds, parentId, newParentBlock?.length || 0);
      }
    },
    [moveBlocks, presentBlocks],
  );
};

export const usePasteBlocks = (): {
  canPaste: (newParentId: string) => Promise<boolean>;
  pasteBlocks: (newParentId: string | string[]) => Promise<void>;
} => {
  const [cutBlockIds, setCutBlockIds] = useCutBlockIds();
  const moveCutBlocks = useMoveCutBlocks();
  const { addPredefinedBlock } = useAddBlock();

  const canPasteBlocks = useCanPaste();
  const canPaste = useCallback(
    async (newParentId: string) => {
      if (cutBlockIds.length > 0) {
        return canPasteBlocks(cutBlockIds, newParentId);
      }
      try {
        if (typeof window !== "undefined")
        {
        const clipboardContent = await navigator.clipboard.readText();
        if (clipboardContent) {
          const clipboardData = JSON.parse(clipboardContent);
          return has(clipboardData, "_chai_copied_blocks");
        }
      }
      } catch (error) {
        return false;
      }
      return false;
    },
    [canPasteBlocks, cutBlockIds],
  );

  return {
    canPaste,
    pasteBlocks: useCallback(
      async (newParentId: string | string[]) => {
        const parentId = Array.isArray(newParentId) ? newParentId[0] : newParentId;

        // Check for paste permissions before proceeding
        if (typeof window !== "undefined") 
        {

        if ( !navigator?.permissions) {
          toast.error("Cannot check clipboard permissions.");
          return;
        }

        try {
          const permissionStatus = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
          if (permissionStatus.state === "denied") {
            toast.error("Clipboard paste permission denied. Please allow clipboard access.");
            return;
          }
        } catch (err) {
          toast.error("Failed to check clipboard permissions. Please allow clipboard access.");
          return;
        }


        if (!isEmpty(cutBlockIds)) {
          moveCutBlocks(cutBlockIds, newParentId);
          setCutBlockIds([]);
          await navigator.clipboard.writeText("");
          return;
        }

        toast.promise(
          async () => {
            const clipboardContent = await navigator.clipboard.readText();
            if (clipboardContent) {
              const clipboardData = JSON.parse(clipboardContent);
              if (has(clipboardData, "_chai_copied_blocks")) {
                addPredefinedBlock(clipboardData._chai_copied_blocks, parentId === "root" ? null : parentId);
              } else {
                throw new Error("Nothing to paste");
              }
            } else {
              throw new Error("Nothing to paste");
            }
          },
          {
            success: () => "Blocks pasted successfully",
            error: () => {
              return "Nothing to paste";
            },
          },
        );
      }
      },
      [cutBlockIds, moveCutBlocks, setCutBlockIds],
    ),
  };
};
