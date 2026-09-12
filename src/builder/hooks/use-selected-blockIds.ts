import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { compact, get as getProp, includes, map, without } from "lodash-es";
import { useCallback } from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { ChaiBlock } from "~/types/common";

/**
 * Core selected  ids atom
 */
export const selectedBlockIdsAtom = atom<Array<string>>([]);
selectedBlockIdsAtom.debugLabel = "selectedBlockIdsAtom";

const blocksByIdAtom = atom<Record<string, ChaiBlock>>((get) => {
  const blocks = get(presentBlocksAtom);
  const byId: Record<string, ChaiBlock> = {};
  blocks.forEach((block) => {
    byId[block._id] = block;
  });
  return byId;
});
blocksByIdAtom.debugLabel = "blocksByIdAtom";

/**
 * Derived atoms
 */
const selectedBlocksAtom = atom<ChaiBlock[]>((get) => {
  const blocksById = get(blocksByIdAtom);
  const blockIds = get(selectedBlockIdsAtom);
  return compact(map(blockIds, (blockId) => blocksById[blockId]));
});
selectedBlocksAtom.debugLabel = "selectedBlocksAtom";

/**
 *
 */
export const selectedBlockAtom = atom((get) => {
  const blocks = get(selectedBlocksAtom);
  if (blocks.length === 0) {
    return undefined;
  }
  if (blocks.length === 1) {
    return blocks[0] as ChaiBlock;
  }
});
selectedBlockAtom.debugLabel = "selectedBlockAtom";

/**
 * useSelectedBlock hook
 */
export const useSelectedBlock = () => useAtomValue(selectedBlockAtom);

// FIXME: This is a hacky way to check if the selected blocks are flex children
// const areFlexChild = (classes: string) => classes.match(/flex( |$)/g) !== null;
// const areGridChild = (classes: string) => classes.match(/grid( |$)/g) !== null;
const getParentId = (block: ChaiBlock | Record<string, never>) => getProp(block, "_parent", null);

export const selectedBlocksParentsAtom = atom((get) => {
  const selectedBlocks = get(selectedBlocksAtom);
  const blocksById = get(blocksByIdAtom);
  const parentIds = [...new Set(map(selectedBlocks, getParentId))];
  return compact(map(parentIds, (parentId) => (parentId ? blocksById[parentId] : undefined))) as ChaiBlock[];
});
selectedBlocksParentsAtom.debugLabel = "selectedBlocksParentsAtom";

export const selectedBlockFlexChildAtom = atom(() => {
  return false;
  // FIXME: Loop over keys to check if any key is styles and has flex in it
  // const styleBlock = first(get(selectedStylingBlocksAtom)) as TStyleBlock;
  // if (!styleBlock) {
  //   return false;
  // }
  // const block = find(get(presentBlocksAtom), { _id: styleBlock.blockId });
  // const parentBlock = find(get(presentBlocksAtom), { _id: block._parent });
  // if (!parentBlock) return false;
  // return areFlexChild(getProp(parentBlock, styleBlock.prop, `${STYLES_KEY},`));
});
selectedBlockFlexChildAtom.debugLabel = "selectedBlockFlexChildAtom";

export const selectedBlockGridChildAtom = atom(() => {
  return false;
  // FIXME: Loop over keys to check if any key is styles and has flex in it
  // const styleBlock = first(get(selectedStylingBlocksAtom)) as TStyleBlock;
  // if (!styleBlock) {
  //   return false;
  // }
  // const block = find(get(presentBlocksAtom), { _id: styleBlock.blockId });
  // const parentBlock = find(get(presentBlocksAtom), { _id: block._parent });
  // if (!parentBlock) return false;
  // return areGridChild(getProp(parentBlock, styleBlock.prop, `${STYLES_KEY},`));
});
selectedBlockGridChildAtom.debugLabel = "selectedBlockGridChildAtom";

export const styleStateAtom: any = atom<string>("");
styleStateAtom.debugLabel = "styleStateAtom";

export const styleBreakpointAtom = atomWithStorage<string>("styleBreakpoint", "xs");
styleBreakpointAtom.debugLabel = "styleBreakpointAtom";

/**
 * Hook to get selected block ids
 */
export const useSelectedBlocksDisplayChild = () => ({
  flexChild: useAtomValue(selectedBlockFlexChildAtom),
  gridChild: useAtomValue(selectedBlockGridChildAtom),
});

export const selectedBlockHierarchy = atom((get) => {
  const selectedBlock = get(selectedBlockAtom);
  const blocksById = get(blocksByIdAtom);
  let block = selectedBlock;
  const blocks = [selectedBlock];
  do {
    const parentBlock = block?._parent ? blocksById[block._parent] : undefined;
    block = parentBlock;
    if (parentBlock) blocks.push(parentBlock);
  } while (block?._parent);

  return blocks;
});

/**
 * TODO: Add test cases for this hook
 */
export const useSelectedBlockHierarchy = () => {
  return compact(useAtomValue(selectedBlockHierarchy)) as ChaiBlock[];
};

/**
 *
 */
export const useSelectedBlockIds = () => {
  const [blockIds, setBlockIds] = useAtom(selectedBlockIdsAtom);
  const toggleSelectedBlockId = useCallback(
    (blockId: string) => {
      setBlockIds((prevIds) => {
        const newBlockIds: Array<string> = includes(prevIds, blockId)
          ? without(prevIds, blockId)
          : [...prevIds, blockId];

        return newBlockIds;
      });
    },
    [setBlockIds],
  );

  return [blockIds, setBlockIds, toggleSelectedBlockId] as const;
};
