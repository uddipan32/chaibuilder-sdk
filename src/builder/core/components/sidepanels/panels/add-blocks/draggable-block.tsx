import { get, isEmpty, omit } from "lodash-es";
import React, { DragEvent } from "react";
import { useDragAndDrop, useIsDragAndDropEnabled } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks";
import { useBlockHighlight } from "~/builder/hooks/use-block-highlight";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { getBlocksFromHTML } from "~/utils/import-html/html-to-json";

type ChaiDraggableBlockProps = {
  html?: string | (() => Promise<string>);
  block?: any | (() => Promise<any>);
  blocks?: any[] | (() => Promise<any[]>);
  children: React.ReactNode;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  draggable?: boolean;
  className?: string;
  type?: "Box" | "Image";
};

/**
 * @component ChaiDraggableBlock
 * @description
 * A draggable wrapper component for Chai Builder blocks.
 * Supports multiple input formats: HTML strings, single blocks, or block arrays.
 * Can handle both synchronous and asynchronous data loading.
 *
 * @example
 * // With HTML
 * <ChaiDraggableBlock html="<div>Content</div>">
 *   <div>Drag me</div>
 * </ChaiDraggableBlock>
 *
 * @example
 * // With block object
 * <ChaiDraggableBlock block={{ type: "Box", props: {} }}>
 *   <div>Drag me</div>
 * </ChaiDraggableBlock>
 *
 * @example
 * // With async blocks
 * <ChaiDraggableBlock blocks={async () => await fetchBlocks()}>
 *   <div>Drag me</div>
 * </ChaiDraggableBlock>
 *
 * @example
 * // With Image block
 * <ChaiDraggableBlock type="Image" block={{ image: "https://example.com/image.jpg" }}>
 *   <img src="https://example.com/image.jpg" alt="Image" />
 * </ChaiDraggableBlock>
 */
export const ChaiDraggableBlock = ({
  block,
  html,
  blocks,
  children,
  onDragStart: customOnDragStart,
  onDragEnd: customOnDragEnd,
  draggable: customDraggable,
  className = "",
  type = "Box",
}: ChaiDraggableBlockProps) => {
  const { onDragStart: defaultOnDragStart, onDragEnd: defaultOnDragEnd } = useDragAndDrop();
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
  const [, setSelected] = useSelectedBlockIds();
  const { clearHighlight } = useBlockHighlight();

  const isDraggable = customDraggable !== undefined ? customDraggable : isDragAndDropEnabled;

  const handleDragStart = async (ev: DragEvent) => {
    try {
      if (customOnDragStart) {
        customOnDragStart(ev);
        return;
      }

      let chaiBlock: any = null;

      if (type === "Image") {
        if (!block?.image) return;
        chaiBlock = {
          type: "Image",
          blocks: [
            {
              _type: "Image",
              styles: "#styles:,w-full h-full object-cover",
              image: block?.image,
              alt: block?.alt || "",
              _name: block?.name || "Image",
            },
          ],
        };
      } else if (html) {
        //Handle HTML input
        const resolvedHtml = typeof html === "function" ? await html() : html;
        const resolvedBlocks = await getBlocksFromHTML(resolvedHtml);
        if (isEmpty(resolvedBlocks)) return;

        chaiBlock = {
          type: "Box",
          blocks: resolvedBlocks,
          name: get(resolvedBlocks, "0._type", "Block"),
        };
      } else if (blocks) {
        //Handle blocks array input
        const resolvedBlocks = typeof blocks === "function" ? await blocks() : blocks;
        if (isEmpty(resolvedBlocks)) return;

        chaiBlock = {
          type: "Box",
          blocks: resolvedBlocks,
          name: get(resolvedBlocks, "0._type", "Block"),
        };
      } else if (block) {
        //Handle single block input
        const resolvedBlock = typeof block === "function" ? await block() : block;
        chaiBlock = typeof resolvedBlock === "object" ? omit(resolvedBlock, ["component", "icon"]) : resolvedBlock;
      }

      if (!chaiBlock) return;

      // Use the default drag start handler with the prepared block
      defaultOnDragStart(ev, chaiBlock, true);

      // Clear selection and highlight
      setTimeout(() => {
        setSelected([]);
        clearHighlight();
      }, 200);
    } catch (error) {
      console.error("Error in ChaiDraggableBlock drag start:", error);
    }
  };

  /**
   * Handles the drag end event
   */
  const handleDragEnd = (ev: DragEvent) => {
    if (customOnDragEnd) {
      customOnDragEnd(ev);
    } else {
      defaultOnDragEnd();
    }
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${isDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
};
