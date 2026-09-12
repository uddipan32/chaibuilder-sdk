import { useThrottledCallback } from "@react-hookz/web";
import { some } from "lodash-es";
import React, { useCallback } from "react";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";
import { useBlockHighlight } from "~/builder/hooks/use-block-highlight";
import { useInlineEditing } from "~/builder/hooks/use-inline-editing";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";

function getTargetedBlock(target: HTMLElement) {
  // First check if the target is the canvas itself
  if (target.getAttribute("data-block-id") === "canvas") {
    return null;
  }

  // Then check for other blocks
  if (target.getAttribute("data-block-id") || target.getAttribute("data-block-parent")) {
    return target;
  }

  // When looking for parent blocks, exclude the canvas
  const closest = target.closest("[data-block-id]");
  return closest?.getAttribute("data-block-id") === "canvas" ? null : closest;
}

const INLINE_EDITABLE_BLOCKS = ["Heading", "Paragraph", "Text", "Link", "Span", "Button"];

const isRichTextParent = (chaiBlock: HTMLElement | null): boolean => {
  return (
    chaiBlock?.getAttribute("data-block-type") === "RichText" ||
    chaiBlock?.parentElement?.getAttribute("data-block-type") === "RichText"
  );
};

const useHandleCanvasMouseDown = () => {
  const { editingBlockId } = useInlineEditing();

  return useCallback(
    (e: any) => {
      if (editingBlockId) return;
      if (e.button !== 0) return;
      const chaiBlock = getTargetedBlock(e.target) as HTMLElement | null;
      if (!chaiBlock) return;
      if (chaiBlock?.getAttribute("data-block-id") && chaiBlock?.getAttribute("data-block-id") === "container") {
        return;
      }

      // Selection is handled by the canvas click handler to avoid publishing
      // duplicate CANVAS_BLOCK_SELECTED / CANVAS_BLOCK_STYLE_SELECTED events
      // during a normal click sequence (mousedown + click).
    },
    [editingBlockId],
  );
};

const hasDataBlockIdInChildren = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  return some(element.children, (child) => {
    const htmlChild = child as HTMLElement;
    return htmlChild.hasAttribute("data-block-id") || hasDataBlockIdInChildren(htmlChild);
  });
};

/**
 *
 * @returns boolean indicating if the block type can be edited inline
 */
export const isInlineEditable = (chaiBlock: HTMLElement | null, _blockType?: string): boolean => {
  // If the block type is set, and the block is not null, return
  if (_blockType && chaiBlock) return false;

  // If the block is a rich text parent, return false (CHANGE LATER)
  if (isRichTextParent(chaiBlock)) {
    return true;
  }

  // If the block type is not set, return false
  const blockType = _blockType || chaiBlock?.getAttribute("data-block-type");
  if (!blockType) return false;

  // If the block has children, return false
  return INLINE_EDITABLE_BLOCKS.includes(blockType);
};

const useHandleCanvasDblClick = () => {
  const { editingBlockId, setEditingBlockId, setEditingItemIndex } = useInlineEditing();

  return useCallback(
    (e: any) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (editingBlockId) return;
      const chaiBlock = getTargetedBlock(e.target) as HTMLElement | null;
      if (!chaiBlock) {
        return;
      }
      if (!isInlineEditable(chaiBlock)) return;

      if (hasDataBlockIdInChildren(chaiBlock)) return;

      const blockId = chaiBlock.getAttribute("data-block-id");
      if (!blockId) return;

      // * Checking for repeater items index
      const repeater = chaiBlock.closest('[data-block-type="Repeater"]');
      if (repeater) {
        repeater?.childNodes?.forEach((repeaterItem, key) => {
          if (repeaterItem.contains(chaiBlock)) {
            setEditingItemIndex(key);
          }
        });
      } else {
        setEditingItemIndex(-1);
      }

      setEditingBlockId(blockId);
    },
    [editingBlockId, setEditingBlockId, setEditingItemIndex],
  );
};

const useHandleCanvasClick = () => {
  const { editingBlockId } = useInlineEditing();
  const { clearHighlight } = useBlockHighlight();
  const [, setSelectedStylingBlocks] = useSelectedStylingBlocks();

  return useCallback(
    (e: any) => {
      if (editingBlockId) return;
      e.stopPropagation();
      const chaiBlock = getTargetedBlock(e.target) as HTMLElement | null;
      // If clicked on empty canvas area (no block found), deselect all blocks
      if (!chaiBlock) {
        clearHighlight();
        setSelectedStylingBlocks([]);
        pubsub.publish(CHAI_BUILDER_EVENTS.CANVAS_BLOCK_SELECTED, []);
        return;
      }
      if (e.detail >= 2) return; // second click of a double-click: dblclick handler owns it
      if (chaiBlock?.getAttribute("data-block-id") && chaiBlock?.getAttribute("data-block-id") === "container") {
        pubsub.publish(CHAI_BUILDER_EVENTS.CLEAR_CANVAS_SELECTION);
        return;
      }
      if (chaiBlock?.getAttribute("data-block-parent")) {
        // check if target element has data-styles-prop attribute
        const styleProp = chaiBlock.getAttribute("data-style-prop") as string;
        const styleId = chaiBlock.getAttribute("data-style-id") as string;
        const blockId = chaiBlock.getAttribute("data-block-parent") as string;
        pubsub.publish(CHAI_BUILDER_EVENTS.CANVAS_BLOCK_STYLE_SELECTED, {
          blockId,
          styleId,
          styleProp,
        });
      } else if (chaiBlock?.getAttribute("data-block-id")) {
        const blockId = chaiBlock.getAttribute("data-block-id");
        pubsub.publish(CHAI_BUILDER_EVENTS.CANVAS_BLOCK_SELECTED, blockId === "canvas" ? [] : [blockId]);
      }
      clearHighlight();
    },
    [editingBlockId, clearHighlight, setSelectedStylingBlocks],
  );
};

const useHandleMouseMove = () => {
  const { editingBlockId } = useInlineEditing();
  const { highlightBlock } = useBlockHighlight();

  return useThrottledCallback(
    (e: any) => {
      if (editingBlockId) return;
      const chaiBlock = getTargetedBlock(e.target) as HTMLElement | null;
      if (chaiBlock) {
        if (chaiBlock.getAttribute("data-highlighted") === "true") return;
        highlightBlock(chaiBlock);
      }
    },
    [editingBlockId, highlightBlock],
    150,
  );
};

const useHandleMouseLeave = () => {
  const { clearHighlight } = useBlockHighlight();
  return useCallback(() => clearHighlight(), [clearHighlight]);
};

export const Canvas = ({ children }: { children: React.ReactNode }) => {
  const handleDblClick = useHandleCanvasDblClick();
  const handleCanvasMouseDown = useHandleCanvasMouseDown();
  const handleCanvasClick = useHandleCanvasClick();
  const handleMouseMove = useHandleMouseMove();
  const handleMouseLeave = useHandleMouseLeave();
  return (
    <div
      data-block-id={"canvas"}
      id="canvas"
      onMouseDown={handleCanvasMouseDown}
      onClick={handleCanvasClick}
      onDoubleClick={handleDblClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative h-full max-w-full`}>
      {children}
    </div>
  );
};

export const getElementByDataBlockId = (doc: any, blockId: string): HTMLElement =>
  doc.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
