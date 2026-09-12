import { convertToBlocksTree } from "~/builder/core/functions/blocks-fn";
import { ChaiBlock } from "~/types/common";

export function getBlocksTree(blocks: ChaiBlock[]) {
  return convertToBlocksTree(blocks);
}
