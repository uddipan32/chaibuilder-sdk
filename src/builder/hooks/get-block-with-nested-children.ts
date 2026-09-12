import { ChaiBlock } from "~/types/common";

/**
 * Recursively collects all descendant blocks for a given parent ID
 * @param blocks - Array of all blocks
 * @param parentId - The ID of the parent block
 * @returns Array of all descendant blocks
 */
const getAllDescendantBlocks = (blocks: ChaiBlock[], parentId: string): ChaiBlock[] => {
  const directChildren = blocks.filter((block) => block._parent === parentId);

  // Recursively get descendants of each child
  const descendants = directChildren.flatMap((child) => getAllDescendantBlocks(blocks, child._id));

  return [...directChildren, ...descendants];
};

/**
 * Gets a block and all its nested children
 * @param blockId - The ID of the block to retrieve
 * @param blocks - Array of all blocks
 * @returns Array containing the block and all its nested children, or empty array if block not found
 */
export const getBlockWithNestedChildren = (blockId: string, blocks: ChaiBlock[]): ChaiBlock[] => {
  const block = blocks.find((b) => b._id === blockId);

  if (!block) return [];

  const descendants = getAllDescendantBlocks(blocks, blockId);

  return [block, ...descendants];
};
