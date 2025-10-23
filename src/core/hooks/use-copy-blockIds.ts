import { getDuplicatedBlocks } from "@/core/functions/blocks-fn";
import { useBlocksStore, usePartailBlocksStore } from "@/core/hooks";
import { cutBlockIdsAtom } from "@/core/hooks/use-cut-blockIds";
import { ChaiBlock } from "@/types/chai-block";
import { atom, useAtom, useSetAtom } from "jotai";
import { isEmpty, set } from "lodash-es";
import { useCallback } from "react";
import { toast } from "sonner";

export const copiedBlockIdsAtom = atom<Array<string>>([]);

export interface CopiedBlock {
  id: string;
  data: any;
}

export interface ClipboardBlock {
  _chai_copied_blocks: any;
}

export const useCopyBlocks = (): [
  Array<string>,
  (blockIds: Array<string>, clonePartialBlocks?: boolean) => void,
  (blockIds: Array<string>) => boolean,
] => {
  const [presentBlocks] = useBlocksStore();
  const [ids, setIds] = useAtom(copiedBlockIdsAtom);
  const resetCutBlockIds = useSetAtom(cutBlockIdsAtom);
  const { getPartailBlocks } = usePartailBlocksStore();

  const hasPartialBlocks = useCallback(
    (blockIds: Array<string>) => {
      return blockIds.some((id) => {
        const duplicatedBlocks = getDuplicatedBlocks(presentBlocks, id, null);
        return duplicatedBlocks.some((block) => block._type === "PartialBlock" || block._type === "GlobalBlock");
      });
    },
    [presentBlocks],
  );

  const copyBlocks = useCallback(
    async (blockIds: Array<string>, clonePartialBlocks: boolean = false) => {
      try {
        if (isEmpty(blockIds)) return;
        setIds(blockIds);
        resetCutBlockIds([]);

        const clipboardData: ClipboardBlock = {
          _chai_copied_blocks: blockIds.flatMap((blockId) => {
            // Get duplicated blocks with children
            const duplicatedBlocks = getDuplicatedBlocks(presentBlocks, blockId, null);
            if (!clonePartialBlocks) {
              return duplicatedBlocks;
            }
            let result: Array<ChaiBlock> = [];
            //check for partial blocks. If found, replace the block with the actual partial blocks
            for (const block of duplicatedBlocks) {
              if (block._type === "PartialBlock" || block._type === "GlobalBlock") {
                // Get the expanded content of the partial block
                let partialBlocks = getPartailBlocks(block.partialBlockId);
                if (block._parent && partialBlocks?.length > 0) {
                  partialBlocks = partialBlocks.map((b) => {
                    if (isEmpty(b._parent)) {
                      set(b, "_parent", block._parent);
                    }
                    return b;
                  });
                }
                // Add each block from the partial block to our result
                result = [...result, ...partialBlocks];
              } else {
                // Keep non-partial blocks as is
                result.push(block);
              }
            }
            return result;
          }),
        };
        if (window) {
          if (!navigator.clipboard) {
            toast.error("Clipboard not available.");
            return;
          }
          toast.promise(navigator.clipboard.writeText(JSON.stringify(clipboardData)), {
            success: "Blocks copied successfully",
            error: "Failed to copy blocks to clipboard",
          });
       }
      } catch (error) {
        toast.error("Failed to copy blocks to clipboard");
        console.error("Failed to copy blocks to clipboard:", error);
      }
    },
    [setIds, resetCutBlockIds, presentBlocks],
  );

  return [ids as string[], copyBlocks, hasPartialBlocks];
};
