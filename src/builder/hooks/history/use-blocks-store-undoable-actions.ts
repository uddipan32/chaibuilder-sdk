import { useAtom } from "jotai";
import { each, first, keys, map } from "lodash-es";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { canvasRenderKeyAtom } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { useBlocksStoreManager } from "~/builder/hooks/history/use-blocks-store-manager";
import { useUndoManager } from "~/builder/hooks/history/use-undo-manager";
import { ChaiBlock } from "~/types/common";

export const useBlocksStore = () => {
  return useAtom(presentBlocksAtom);
};

/**
 * Force a clean remount of the canvas renderer. A fresh drag-and-drop drop
 * already does this (use-block-drop bumps the same key); undo/redo of a
 * structural change must too, otherwise the per-block/structure subscriptions
 * don't repaint the moved/added/removed subtree reliably. Prop-only history
 * (typing) intentionally skips this so those edits stay isolated and fast.
 */
const bumpCanvasRenderKey = () => builderStore.set(canvasRenderKeyAtom, (key: number) => key + 1);

export const useBlocksStoreUndoableActions = () => {
  const { add } = useUndoManager();
  const {
    setNewBlocks: setBlocks,
    addBlocks: addNewBlocks,
    removeBlocks: removeExistingBlocks,
    moveBlocks: moveExistingBlocks,
    replaceBlocks: replaceExistingBlocks,
    updateBlocksProps,
  } = useBlocksStoreManager();

  const setNewBlocks = (newBlocks: ChaiBlock[]) => {
    const previousBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    setBlocks(newBlocks);
    add({
      undo: () => {
        setBlocks(previousBlocks);
        bumpCanvasRenderKey();
      },
      redo: () => {
        setBlocks(newBlocks);
        bumpCanvasRenderKey();
      },
    });
  };

  const addBlocks = (newBlocks: ChaiBlock[], parent?: string, position?: number) => {
    addNewBlocks(newBlocks, parent, position);
    add({
      undo: () => {
        removeExistingBlocks(map(newBlocks, "_id"));
        bumpCanvasRenderKey();
      },
      redo: () => {
        addNewBlocks(newBlocks, parent, position);
        bumpCanvasRenderKey();
      },
    });
  };

  const removeBlocks = (blocks: ChaiBlock[]) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    const parentId = first(blocks)?._parent;
    const siblings = latestBlocks.filter((block) => (parentId ? block._parent === parentId : !block._parent));
    const position = siblings.indexOf(first(blocks) as ChaiBlock);

    removeExistingBlocks(map(blocks, "_id"));
    add({
      undo: () => {
        addNewBlocks(blocks, parentId ?? undefined, position);
        bumpCanvasRenderKey();
      },
      redo: () => {
        removeExistingBlocks(map(blocks, "_id"));
        bumpCanvasRenderKey();
      },
    });
  };

  const moveBlocks = (blockIds: string[], parent: string | undefined, position: number) => {
    // Snapshot the full block array before the move. Replaying an inverse move
    // for undo is unreliable: moveBlocksWithChildren adjusts the target index
    // when reordering within a parent, so moving a block up then "moving it
    // back" to its old index lands it in the same spot (undo appears to do
    // nothing). Blocks are never mutated in place (convertToBlocksTree copies
    // every node), so these snapshots stay valid; restoring the whole array is
    // exact. Move is infrequent, so the array swap + canvas remount is fine.
    const previousBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    const firstBlock = previousBlocks.find((block) => block._id === blockIds[0]);

    // If dropped back in the same spot, do nothing (no history entry)
    if (firstBlock) {
      const oldParent = firstBlock._parent || null;
      const siblings = previousBlocks
        .filter((block) => (oldParent ? block._parent === oldParent : !block._parent))
        .map((block) => block._id);
      if (oldParent === (parent ?? null) && siblings.indexOf(blockIds[0]) === position) {
        return;
      }
    }

    moveExistingBlocks(blockIds, parent ?? null, position);
    const nextBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    add({
      undo: () => {
        setBlocks(previousBlocks);
        bumpCanvasRenderKey();
      },
      redo: () => {
        setBlocks(nextBlocks);
        bumpCanvasRenderKey();
      },
    });
  };

  const updateBlocks = (blockIds: string[], props: Partial<ChaiBlock>, oldPropsState?: Partial<ChaiBlock>) => {
    const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
    let previousPropsState: Array<{ _id: string } & Partial<ChaiBlock>> = [];
    if (oldPropsState) {
      previousPropsState = map(blockIds, (_id: string) => {
        return { _id, ...oldPropsState };
      });
    } else {
      const propKeys = keys(props);
      const blocksById = new Map(latestBlocks.map((block) => [block._id, block]));
      previousPropsState = map(blockIds, (_id: string) => {
        const block = blocksById.get(_id) as ChaiBlock;
        const prevProps: Record<string, any> = { _id };
        each(propKeys, (key: string) => (prevProps[key] = block[key]));
        return prevProps as { _id: string } & Partial<ChaiBlock>;
      });
    }

    updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props })));
    add({
      undo: () => updateBlocksProps(previousPropsState as Array<{ _id: string } & Partial<ChaiBlock>>),
      redo: () => updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props }))),
    });
  };

  const updateMultipleBlocksProps = (
    blocks: Array<{ _id: string } & Partial<ChaiBlock>>,
    oldPropsState?: Array<{ _id: string } & Partial<ChaiBlock>>,
  ) => {
    const previousPropsState =
      oldPropsState ??
      (() => {
        const latestBlocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
        const blocksById = new Map(latestBlocks.map((block) => [block._id, block]));
        return map(blocks, (block: Partial<ChaiBlock>) => {
          const propKeys = keys(block);
          const currentBlock = blocksById.get(block._id as string);
          const prevProps: Record<string, any> = { _id: block._id };
          each(propKeys, (key: string) => (prevProps[key] = currentBlock?.[key]));
          return prevProps as { _id: string } & Partial<ChaiBlock>;
        });
      })();

    updateBlocksProps(blocks);
    add({
      undo: () => updateBlocksProps(previousPropsState),
      redo: () => updateBlocksProps(blocks),
    });
  };

  const updateBlocksRuntime = (blockIds: string[], props: Record<string, any>) => {
    updateBlocksProps(map(blockIds, (_id: string) => ({ _id, ...props })));
  };

  const replaceBlocks = (removeBlocks: ChaiBlock[], newBlocks: ChaiBlock[], parentId?: string, position?: number) => {
    const removeIds = map(removeBlocks, "_id");
    replaceExistingBlocks(removeIds, newBlocks, parentId, position);
    add({
      undo: () => {
        replaceExistingBlocks(map(newBlocks, "_id"), removeBlocks, parentId, position);
        bumpCanvasRenderKey();
      },
      redo: () => {
        replaceExistingBlocks(removeIds, newBlocks, parentId, position);
        bumpCanvasRenderKey();
      },
    });
  };

  return {
    moveBlocks,
    addBlocks,
    removeBlocks,
    replaceBlocks,
    updateBlocks,
    updateBlocksRuntime,
    setNewBlocks,
    updateMultipleBlocksProps,
  };
};
