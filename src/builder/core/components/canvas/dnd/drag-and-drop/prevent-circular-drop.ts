/**
 * ============================================================================
 * PREVENT CIRCULAR DROP UTILITY
 * ============================================================================
 *
 * Utilities to prevent dropping a block inside itself or its descendants.
 * This prevents circular references and maintains tree structure integrity.
 *
 * @module prevent-circular-drop
 */

import { ChaiBlock } from "~/types/common";

/**
 * Checks if targetId is a descendant of ancestorId
 * @param targetId - The ID of the block to check (potential descendant)
 * @param ancestorId - The ID of the potential ancestor
 * @param allBlocks - All blocks in the canvas
 * @returns true if targetId is a descendant of ancestorId
 */
export function isDescendantOf(targetId: string, ancestorId: string, allBlocks: ChaiBlock[]): boolean {
  if (!targetId || !ancestorId) return false;
  if (targetId === ancestorId) return true;

  // Find the target block
  const targetBlock = allBlocks.find((b) => b._id === targetId);
  if (!targetBlock) return false;

  // Check parent chain going up
  let currentBlock = targetBlock;
  while (currentBlock._parent) {
    if (currentBlock._parent === ancestorId) {
      return true;
    }
    const parentBlock = allBlocks.find((b) => b._id === currentBlock._parent);
    if (!parentBlock) break;
    currentBlock = parentBlock;
  }

  return false;
}

/**
 * Checks if dropping draggedBlock into targetParentId would create a circular reference
 * @param draggedBlockId - The ID of the block being dragged
 * @param targetParentId - The ID of the target parent (where we want to drop)
 * @param allBlocks - All blocks in the canvas
 * @returns true if the drop would be valid (no circular reference), false otherwise
 */
export function canDropWithoutCircularReference(
  draggedBlockId: string | undefined,
  targetParentId: string | null | undefined,
  allBlocks: ChaiBlock[],
): boolean {
  // If no dragged block ID, it's a new block, so it's safe
  if (!draggedBlockId) return true;

  // If dropping at root level (no parent), it's safe
  if (!targetParentId) return true;

  // Check if the target parent is the dragged block itself or one of its descendants
  return !isDescendantOf(targetParentId, draggedBlockId, allBlocks);
}

/**
 * Checks if dropping draggedBlock as a sibling of targetBlockId would create a circular reference
 * @param draggedBlockId - The ID of the block being dragged
 * @param targetBlockId - The ID of the target block (sibling position)
 * @param allBlocks - All blocks in the canvas
 * @returns true if the drop would be valid (no circular reference), false otherwise
 */
export function canDropAsSiblingWithoutCircularReference(
  draggedBlockId: string | undefined,
  targetBlockId: string,
  allBlocks: ChaiBlock[],
): boolean {
  // If no dragged block ID, it's a new block, so it's safe
  if (!draggedBlockId) return true;

  // Find the target block's parent
  const targetBlock = allBlocks.find((b) => b._id === targetBlockId);
  if (!targetBlock) return true;

  const targetParentId = targetBlock._parent;

  // Use the same logic as dropping inside a parent
  return canDropWithoutCircularReference(draggedBlockId, targetParentId, allBlocks);
}
