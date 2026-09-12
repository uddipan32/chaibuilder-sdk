/**
 * ============================================================================
 * DRAG AND DROP HOOKS - MAIN EXPORT
 * ============================================================================
 *
 * Central export file for all drag and drop hooks and utilities.
 * Import from this file to access the complete drag and drop system.
 *
 * @module hooks/index
 *
 *
 * import { useDragAndDrop } from './hooks';
 * const { onDragStart, onDragOver, onDrop, onDragEnd, isDragging } = useDragAndDrop();
 */

import { useAtom } from "jotai";
import { DragEvent } from "react";
import { useBlockDragEnd } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-end";
import { useBlockDragOver } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-over";
import { useBlockDragStart } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-start";
import { useBlockDrop } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drop";
import {
  dropIndicatorAtom,
  isDragging,
} from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";

// Export individual hooks
export { useBlockDragEnd } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-end";
export { useBlockDragOver } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-over";
export { useBlockDragStart } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drag-start";
export { useBlockDrop } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-block-drop";
export { useDragParentHighlight } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-parent-highlight";

// Export atoms and state
export {
  canvasRenderKeyAtom,
  dragAndDropAtom,
  dropIndicatorAtom,
  isDragging,
  setIsDragging,
} from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
export type { DropIndicatorState } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";

/**
 * Interface for the complete drag and drop system
 */
export interface DragAndDrop {
  /** Handler for drag start event */
  onDragStart: (e: DragEvent, block: any, isAddNew?: boolean, previewUrl?: string) => void;
  /** Handler for drag over event */
  onDragOver: (e: DragEvent) => void;
  /** Handler for drop event */
  onDrop: (e: DragEvent) => void;
  /** Handler for drag end event */
  onDragEnd: () => void;
  /** Whether a drag operation is currently active */
  isDragging: boolean;
}

/**
 * @HOOK useDragAndDrop
 * @description
 * Main hook that combines all drag and drop functionality.
 * Returns handlers for all drag events and the current dragging state.
 *
 * This is a convenience hook that wraps all individual drag hooks
 * into a single, easy-to-use interface.
 *
 * Features:
 * - Complete drag and drop lifecycle management
 * - Intelligent placeholder positioning
 * - Gap detection and edge-based placement
 * - Leaf block protection
 * - Visual feedback and validation
 *
 * @returns Object with all drag event handlers and state
 *
 * @example
 * const { onDragStart, onDragOver, onDrop, onDragEnd, isDragging } = useDragAndDrop();
 *
 * <div
 *   draggable
 *   onDragStart={(e) => onDragStart(e, block)}
 *   onDragOver={onDragOver}
 *   onDrop={onDrop}
 *   onDragEnd={onDragEnd}
 * >
 *   Block content
 * </div>
 */
export const useDragAndDrop = (): DragAndDrop => {
  const onDragStart = useBlockDragStart();
  const onDragOver = useBlockDragOver();
  const onDrop = useBlockDrop();
  const onDragEnd = useBlockDragEnd();

  return {
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
  };
};

export const useDropIndicator = () => {
  const [dropIndicator] = useAtom(dropIndicatorAtom);
  return dropIndicator;
};

export const useIsDragAndDropEnabled = () => {
  const { dragAndDrop } = useBuilderProp("flags", { dragAndDrop: true });
  return dragAndDrop;
};
