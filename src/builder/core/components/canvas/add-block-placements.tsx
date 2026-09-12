import { filter, findIndex, get } from "lodash-es";
import { useTranslation } from "react-i18next";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { canAddChildBlock } from "~/builder/core/functions/block-helpers";
import { pubsub } from "~/builder/core/pubsub";
import { usePermissions } from "~/builder/hooks/use-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { ChaiBlock } from "~/types/common";
/**
 *
 * @param params
 * @returns Add block dropdown [as child, before, after]
 */
const AddBlockDropdown = ({ block, children }: { block: ChaiBlock; children: any }) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  // * Parent Block
  const blockId = get(block, "_id");
  const parentBlockId = get(block, "_parent");

  // * Current Block Details
  const canAddChild = canAddChildBlock(get(block, "_type", ""));

  // * Function to add blocks
  const addBlock = (type: "CHILD" | "BEFORE" | "AFTER") => {
    if (type === "CHILD") {
      pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, block);
    } else {
      // PERF: sibling positions are only needed on click — read blocks on demand
      // instead of subscribing to every block change
      const blocks = builderStore.get(presentBlocksAtom) as ChaiBlock[];
      const ancestorBlocks = filter(blocks, (thisBlock: ChaiBlock) => {
        if (!parentBlockId) return !get(thisBlock, "_parent");
        return get(thisBlock, "_parent") === parentBlockId;
      });
      const blockIndex = findIndex(ancestorBlocks, { _id: blockId });
      const options = {
        _id: parentBlockId || "",
        position: ancestorBlocks?.length,
      };
      if (type === "BEFORE") {
        options.position = Math.max(blockIndex, 0);
      } else if (type === "AFTER") {
        options.position = blockIndex + 1;
      }
      pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK, options);
    }
  };

  if (!hasPermission(CHAI_PERMISSIONS["pages:update"])) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="border border-blue-500 bg-primary text-white shadow-2xl">
        {canAddChild && (
          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => addBlock("CHILD")}>
            {t("Add inside")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => addBlock("BEFORE")}>
          {t("Add before")}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => addBlock("AFTER")}>
          {t("Add after")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddBlockDropdown;
