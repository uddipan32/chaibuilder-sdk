import { atom, useSetAtom } from "jotai";
import { compact, each, first, get as getProp, includes, map } from "lodash-es";
import { useCallback } from "react";
import { blockAtomsMapAtom } from "~/builder/atoms/blocks";
import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { useBlocksStoreUndoableActions } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { selectedStylingBlocksAtom, TStyleBlock } from "~/builder/hooks/use-selected-styling-blocks";
import { STYLES_KEY } from "~/constants/STRINGS";
import { ChaiBlock } from "~/types/common";

export const removeClassFromBlocksAtom: any = atom(null, (get, _set, { blockIds, fullClasses }) => {
  const styleBlock = first(get(selectedStylingBlocksAtom)) as TStyleBlock;
  const atomsMap = get(blockAtomsMapAtom);
  const blockAtoms = compact(map(blockIds, (id: string) => atomsMap.get(id)));

  return map(blockAtoms, (blockAtom) => {
    const block: ChaiBlock = get(blockAtom as any);
    const nonDynamicClasses: string[] = fullClasses;

    let { classes, baseClasses } = getSplitChaiClasses(getProp(block, styleBlock.prop, `${STYLES_KEY},`));

    each(nonDynamicClasses, (fullCls: string) => {
      const escapedClass = fullCls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regEx = new RegExp(`(^|\\s)${escapedClass}(?=\\s|$)`, "g");
      classes = classes.replace(regEx, " ").replace(/\s+/g, " ").trim();
      const mq = first(fullCls.split(":"));
      if (includes(["2xl", "xl", "lg", "md", "sm"], mq)) {
        nonDynamicClasses.push((fullCls.split(":").pop() as string).trim());
      }
    });

    each(nonDynamicClasses, (fullCls: string) => {
      const escapedClass = fullCls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regEx = new RegExp(`(^|\\s)${escapedClass}(?=\\s|$)`, "g");
      baseClasses = baseClasses.replace(regEx, " ").replace(/\s+/g, " ").trim();
    });

    return {
      ids: [block._id],
      props: {
        [styleBlock.prop]: `${STYLES_KEY}${baseClasses},${classes}`,
      },
    };
  });
});

export const removeAllClassesForBlock = (block: ChaiBlock): { ids: string[]; props: Record<string, string> } => {
  const styleProps = Object.keys(block).filter(
    (prop) => typeof block[prop] === "string" && (block[prop] as string).startsWith(STYLES_KEY),
  );

  const updatedProps: Record<string, string> = {};

  styleProps.forEach((prop) => {
    updatedProps[prop] = `${STYLES_KEY},`;
  });

  return {
    ids: [block._id],
    props: updatedProps,
  };
};

export const useRemoveAllClassesForBlock = () => {
  const { updateBlocks, updateBlocksRuntime } = useBlocksStoreUndoableActions();

  return useCallback(
    (block: ChaiBlock, undo = false) => {
      const { ids, props } = removeAllClassesForBlock(block);
      if (undo) {
        updateBlocks(ids, props);
      } else {
        updateBlocksRuntime(ids, props);
      }
    },
    [updateBlocks, updateBlocksRuntime],
  );
};

export const useRemoveClassesFromBlocks = () => {
  const { updateBlocks, updateBlocksRuntime } = useBlocksStoreUndoableActions();
  const removeClassesFromBlocks = useSetAtom(removeClassFromBlocksAtom);
  return useCallback(
    (blockIds: Array<string>, fullClasses: Array<string>, undo: boolean = false) => {
      const blocks = removeClassesFromBlocks({ blockIds, fullClasses }) as {
        ids: string[];
        props: Record<string, string>;
      }[];
      if (!undo) {
        updateBlocksRuntime(blockIds, blocks[0].props);
      } else {
        updateBlocks(blockIds, blocks[0].props);
      }
    },
    [removeClassesFromBlocks, updateBlocks, updateBlocksRuntime],
  );
};
