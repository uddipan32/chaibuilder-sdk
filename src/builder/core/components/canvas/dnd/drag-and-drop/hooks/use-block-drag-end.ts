/**
 * ============================================================================
 * USE BLOCK DRAG END HOOK
 * ============================================================================
 *
 * Hook that handles the cleanup when a drag operation ends.
 * Resets all drag state and clears visual feedback, ensuring the UI
 * returns to its normal state after drag completion or cancellation.
 *
 * @module use-block-drag-end
 */

import { useAtom } from "jotai";
import { useCallback } from "react";
import {
  canvasRenderKeyAtom,
  dragAndDropAtom,
  dropIndicatorAtom,
  setIsDragging,
} from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { useDragParentHighlight } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-parent-highlight";
import { useCanvasIframe } from "~/builder/hooks/use-canvas-iframe";
import { useSidebarPanelSwap } from "~/builder/hooks/use-sidebar-active-panel";

/**
 * @HOOK useBlockDragEnd
 * @description
 * Handles cleanup when drag operation ends (either by drop or cancellation).
 *
 * Features:
 * - Clears dragged block state
 * - Hides drop indicator
 * - Removes visual feedback attributes from DOM
 * - Resets global dragging flag
 *
 * This hook is called automatically by the browser when:
 * - User drops the element (after onDrop)
 * - User cancels the drag (ESC key or invalid drop)
 * - Drag operation completes for any reason
 *
 * @returns Function to call on drag end event
 *
 * @example
 * const onDragEnd = useBlockDragEnd();
 * <div onDragEnd={onDragEnd} />
 */
export const useBlockDragEnd = () => {
  const [, setDraggedBlock] = useAtom(dragAndDropAtom);
  const [, setDropIndicator] = useAtom(dropIndicatorAtom);
  const [, setPanelSwap] = useSidebarPanelSwap();
  const [iframe] = useCanvasIframe();
  const { clearParentHighlight } = useDragParentHighlight();
  const [renderKey, setRenderKey] = useAtom(canvasRenderKeyAtom);

  // Get the document from the iframe element
  const iframeDoc = (iframe as HTMLIFrameElement)?.contentDocument;

  return useCallback(() => {
    // Clear dragged block state
    setDraggedBlock(null);

    // Release the panel the sidebar slid away from, so it can animate back in
    // and the left panel is free to resize again
    setPanelSwap(null);

    // Hide drop indicator
    setDropIndicator({
      isVisible: false,
      isValid: false,
      position: "inside",
      placeholderOrientation: "horizontal",
      isEmpty: false,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    });

    // Remove visual feedback attributes from all elements
    removeDropTargetAttributes(iframeDoc);

    // Clear parent highlight from drag operation
    clearParentHighlight();

    // Clean up dragging elements (re-render will restore proper state)
    if (iframeDoc) {
      const draggingElements = iframeDoc.querySelectorAll("[data-dragging]");
      draggingElements.forEach((el) => {
        el.removeAttribute("data-dragging");
      });
    }

    // Reset global dragging flag
    setIsDragging(false);

    // Force re-render of canvas by incrementing render key
    setRenderKey(renderKey + 1);
  }, [setDraggedBlock, setDropIndicator, setPanelSwap, iframeDoc, clearParentHighlight, renderKey, setRenderKey]);
};

/**
 * @FUNCTION removeDropTargetAttributes
 * @description
 * Removes the data-drop-target attribute from all elements in the iframe.
 * This clears any visual feedback that was applied during drag operations.
 *
 * @param iframeDoc - The iframe document containing the canvas
 */
function removeDropTargetAttributes(iframeDoc: Document | null | undefined) {
  if (!iframeDoc) return;

  const elements = iframeDoc.querySelectorAll("[data-drop-target]");
  elements.forEach((el) => el.removeAttribute("data-drop-target"));
}
