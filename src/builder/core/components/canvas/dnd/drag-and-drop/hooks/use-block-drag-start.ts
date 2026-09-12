/**
 * ============================================================================
 * USE BLOCK DRAG START HOOK
 * ============================================================================
 *
 * Hook that handles the start of a drag operation.
 * Initializes drag state, sets up the dragged block data, and prepares
 * the initial drop indicator for a smooth drag experience.
 *
 * @module use-block-drag-start
 */

import { useAtom } from "jotai";
import { pick } from "lodash-es";
import { DragEvent, useCallback, useRef } from "react";
import {
  cleanupDragImage,
  createCoreDragImage,
} from "~/builder/core/components/canvas/dnd/drag-and-drop/create-drag-image";
import {
  dragAndDropAtom,
  dropIndicatorAtom,
  setIsDragging,
} from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { getOrientation } from "~/builder/core/components/canvas/dnd/getOrientation";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";
import { useBlockHighlight } from "~/builder/hooks/use-block-highlight";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import { useSidebarActivePanel, useSidebarPanelSwap } from "~/builder/hooks/use-sidebar-active-panel";
import { ChaiBlock } from "~/types/common";

/**
 * @HOOK useBlockDragStart
 * @description
 * Handles the initialization of drag operations for blocks.
 *
 * Features:
 * - Stores dragged block data (type only for new blocks, full data for existing)
 * - Clears current selection and highlights
 * - Sets up invisible drag image for custom cursor
 * - Initializes drop indicator with default canvas state
 * - Publishes event to close add block panel
 *
 * @returns Function to call on drag start event
 *
 * @example
 * const onDragStart = useBlockDragStart();
 * <div onDragStart={(e) => onDragStart(e, block, true)} />
 */
export const useBlockDragStart = () => {
  const [, setSelectedBlockIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const { clearHighlight } = useBlockHighlight();
  const [activePanel, setActivePanel] = useSidebarActivePanel();
  const [, setPanelSwap] = useSidebarPanelSwap();
  const [, setDraggedBlock] = useAtom(dragAndDropAtom);
  const [, setDropIndicator] = useAtom(dropIndicatorAtom);
  const dragImageRef = useRef<HTMLElement | null>(null);

  return useCallback(
    (e: DragEvent, _block: ChaiBlock, isAddNew: boolean = true) => {
      // Clean up any previous drag image
      if (dragImageRef.current) {
        cleanupDragImage(dragImageRef.current);
        dragImageRef.current = null;
      }

      // For new blocks, only store the type and blocks; for existing blocks, store the full block.
      // `blocksPromise` is kept for sources (library blocks) that fetch their blocks after
      // dragstart — the drop handler awaits it instead of falling back to the placeholder type.
      const block = (
        isAddNew ? pick(_block, ["type", "blocks", "blocksPromise", "partialBlockId", "_name"]) : _block
      ) as ChaiBlock;

      // Store the dragged block in atom for access by other hooks
      setDraggedBlock(block);

      // Set up drag data transfer (required for drag/drop API)
      e.dataTransfer.setData("text/plain", JSON.stringify({ block }));
      e.dataTransfer.effectAllowed = "move";

      // Reduce height and opacity of tall dragging elements for visual feedback
      if (!isAddNew && _block._id) {
        const iframeDoc = (document.getElementById("canvas-iframe") as HTMLIFrameElement)?.contentDocument;
        if (iframeDoc) {
          const draggingElement = iframeDoc.querySelector(`[data-block-id="${_block._id}"]`) as HTMLElement;
          if (draggingElement) {
            // Use a small timeout to allow browser to capture drag image first
            setTimeout(() => {
              if (draggingElement && draggingElement.parentElement) {
                const rect = draggingElement.getBoundingClientRect();
                const currentHeight = rect.height;
                // Check if parent has vertical orientation (flex-direction: column or default block flow)
                const orientation = draggingElement.parentElement && getOrientation(draggingElement.parentElement);

                // If height > 200px and parent has vertical orientation, reduce height to 100px
                if (orientation === "vertical" && currentHeight > 200) {
                  // Force height to 100px by setting both height and max-height
                  draggingElement.style.height = "max-content";
                  draggingElement.style.maxHeight = "max-content";
                  draggingElement.style.minHeight = "0";
                  draggingElement.style.overflow = "hidden";
                  draggingElement.innerHTML =
                    "<div class='flex items-center justify-center w-full h-full outline-[1px] outline-dashed font-medium outline-gray-500 bg-gray-500/10 py-4 text-transparent'>-</div>";
                  draggingElement.style.opacity = "0.4";
                }
                // Reduce opacity for visual feedback
                draggingElement.style.opacity = "0.4";

                draggingElement.setAttribute("data-dragging", "true");
              }
            }, 0);
          }
        }
      }

      // Create custom drag image
      if (_block?._type || _block?.type) {
        // Core block with icon and label
        const dragImage = createCoreDragImage(_block);
        dragImageRef.current = dragImage;
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        // Clean up after a short delay to ensure drag has started
        setTimeout(() => {
          if (dragImageRef.current) {
            cleanupDragImage(dragImageRef.current);
            dragImageRef.current = null;
          }
        }, 50);
      }

      // Clear any existing selection and highlights
      setSelectedBlockIds([]);
      clearHighlight();
      setStyleBlocks([]);

      // Close the add block panel. Deferred for the same reason as the panel swap
      // below: the Add Blocks modal hosts the drag source, and hiding it
      // synchronously inside dragstart makes the grabbed block vanish.
      setTimeout(() => pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK), 0);
      if (isAddNew) {
        // Dragging out of the Add Blocks panel: it slides away and the Outline
        // slides in behind it, so the block can also be dropped on the tree.
        // Cleared on drag end.
        if (activePanel === "add-block") setPanelSwap(activePanel);
        // Let the browser capture the source and custom drag image before unmounting
        // the Add panel; switching it synchronously makes the grabbed block vanish.
        setTimeout(() => setActivePanel("outline"), 0);
      }

      // Set global dragging flag
      setIsDragging(true);

      // Initialize with a default valid drop indicator (canvas root)
      // This ensures there's always a valid drop position available
      setDropIndicator({
        isVisible: true,
        isValid: true,
        position: "inside",
        placeholderOrientation: "horizontal",
        isEmpty: true,
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        targetBlockId: "canvas",
        targetParentId: undefined,
      });
    },
    [
      setDraggedBlock,
      setSelectedBlockIds,
      clearHighlight,
      setStyleBlocks,
      setDropIndicator,
      activePanel,
      setActivePanel,
      setPanelSwap,
    ],
  );
};
