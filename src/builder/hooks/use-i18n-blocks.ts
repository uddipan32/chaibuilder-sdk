import { compact, each, get, pick } from "lodash-es";
import { useCallback } from "react";
import { useBlocksStore } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { getRegisteredChaiBlock } from "~/registry";
import { getBlockWithNestedChildren } from "./get-block-with-nested-children";

export const useI18nBlocks = () => {
  const selectedBlock = useSelectedBlock();
  const [currentBlocks] = useBlocksStore();
  return useCallback(
    (lang: string | "ALL" = "") => {
      const blocks = selectedBlock?._id ? getBlockWithNestedChildren(selectedBlock._id, currentBlocks) : currentBlocks;
      if (!blocks) return [];
      return compact(
        blocks.map((block) => {
          const blockDefinition = getRegisteredChaiBlock(block._type);
          if (!blockDefinition) return null;
          const i18nProps = blockDefinition?.i18nProps ?? [];
          if (i18nProps.length === 0) return null;
          const keys =
            lang === "ALL"
              ? Object.keys(block).filter((key) => i18nProps.find((prop) => key.startsWith(prop)))
              : i18nProps.map((prop) => (lang ? `${prop}-${lang}` : prop));
          const blockProps: Record<string, any> = pick(block, ["_id"]);
          each(keys, (key) => {
            blockProps[key] = get(block, key, get(block, key.replace(`-${lang}`, "")));
          });
          return blockProps;
        }),
      );
    },
    [selectedBlock, currentBlocks],
  );
};
