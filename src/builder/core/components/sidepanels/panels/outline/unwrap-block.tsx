import { PackageOpen } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { moveBlocksWithChildren } from "~/builder/hooks/history/move-blocks-with-children";
import {
  useBlocksStore,
  useBlocksStoreUndoableActions,
} from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { removeNestedBlocks } from "~/builder/hooks/use-remove-blocks";
import { useSelectedBlock, useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";

export const useUnwrapBlock = () => {
  const selectedBlock = useSelectedBlock();
  const [, setBlockIds] = useSelectedBlockIds();
  const { setNewBlocks } = useBlocksStoreUndoableActions();
  const [blocks] = useBlocksStore();

  const unwrapBlock = useCallback(() => {
    if (!selectedBlock) return;

    const children = blocks.filter((b) => b._parent === selectedBlock._id);
    const parentId = selectedBlock._parent;
    const siblings = blocks.filter((b) => (!parentId ? !b._parent : b._parent === parentId));
    const position = siblings.findIndex((b) => b._id === selectedBlock._id);

    let newBlocks = [...blocks];
    if (children.length > 0) {
      const childIds = children.map((c) => c._id);
      for (let i = 0; i < childIds.length; i++) {
        newBlocks = moveBlocksWithChildren(newBlocks, childIds[i], parentId ?? undefined, position + i);
      }
    }

    // Remove the current box
    newBlocks = removeNestedBlocks(newBlocks, [selectedBlock._id]);

    setNewBlocks(newBlocks);

    if (children.length > 0) {
      setTimeout(() => {
        setBlockIds([children[0]._id]);
      }, 100);
    } else {
      setBlockIds([]);
    }
  }, [selectedBlock, blocks, setNewBlocks, setBlockIds]);

  const canUnwrap = !!selectedBlock && selectedBlock._type === "Box";

  return {
    unwrapBlock,
    canUnwrap,
    shouldRender: canUnwrap,
  };
};

// ============ Components ============

export const UnwrapComponent = ({ MenuItem = DropdownMenuItem }: { MenuItem?: React.ComponentType<any> }) => {
  const { t } = useTranslation();
  const { unwrapBlock, shouldRender } = useUnwrapBlock();

  if (!shouldRender) return null;

  return (
    <MenuItem onClick={unwrapBlock} className="flex items-center gap-x-2 text-xs">
      <PackageOpen className="h-3.5 w-3.5" /> {t("Unwrap")}
    </MenuItem>
  );
};
