/**
 * ============================================================================
 * USE DRAG PARENT HIGHLIGHT HOOK
 * ============================================================================
 *
 * Hook specifically for highlighting parent elements during drag operations.
 * This provides visual feedback to show which container will receive the dropped element.
 *
 * Features:
 * - Applies a green dashed outline with subtle background color to the parent element
 * - Displays a floating label showing the parent block's name or type
 * - Uses direct inline style manipulation for immediate visibility
 * - Label is positioned at the top-left corner of the highlighted element
 * - Automatically cleans up when drag operation ends
 *
 * @module use-drag-parent-highlight
 */

import { useCallback, useMemo } from "react";
import { useCanvasIframe } from "~/builder/hooks/use-canvas-iframe";

// Module-level variables to track the last highlighted parent and its label during drag
let lastDragHighlighted: HTMLElement | null = null;
let floatingLabel: HTMLElement | null = null;

/**
 * @FUNCTION createFloatingLabel
 * @description
 * Creates a floating label element to display the parent block's name or type.
 * The label is positioned at the top-left corner of the highlighted element.
 *
 * @param targetElement - The parent element being highlighted
 * @param innerDoc - The iframe document
 * @returns The created label element
 */
function createFloatingLabel(targetElement: HTMLElement, innerDoc: Document): HTMLElement {
  // Get block name or type from data attributes
  const blockName = targetElement.getAttribute("data-block-name");
  const blockType = targetElement.getAttribute("data-block-type");
  const labelText = blockName || blockType || "Container";

  // Create label element
  const label = innerDoc.createElement("div");
  label.className = "chai-drag-parent-label";
  label.textContent = labelText;

  // Apply inline styles for positioning and appearance
  label.className =
    "absolute top-0 -left-0.5 -translate-x-0.5 -translate-y-full -mt-1 bg-green-500/95 text-white px-2 py-1 text-xs font-semibold font-sans leading-tight whitespace-nowrap shadow-lg z-[999999] pointer-events-none select-none";

  return label;
}

/**
 * @FUNCTION removeFloatingLabel
 * @description
 * Removes the floating label from the DOM if it exists.
 */
function removeFloatingLabel() {
  if (floatingLabel && floatingLabel.parentNode) {
    floatingLabel.parentNode.removeChild(floatingLabel);
    floatingLabel = null;
  }
}

/**
 * @HOOK useDragParentHighlight
 * @description
 * Manages highlighting of parent elements during drag-and-drop operations.
 * Uses a separate tracking mechanism from the regular block highlight to avoid conflicts.
 *
 * Features:
 * - Highlights parent container during drag operations with inline styles
 * - Displays a floating label with the parent block's name or type
 * - Automatically clears previous highlight when highlighting a new parent
 * - Uses direct style manipulation (outline + background) for immediate visibility
 * - Separate from regular block highlighting to prevent conflicts
 * - Green dashed outline with subtle background for clear visual feedback
 * - Label shows data-block-name if available, otherwise falls back to data-block-type
 *
 * @returns Object with highlightParent and clearParentHighlight functions
 *
 * @example
 * const { highlightParent, clearParentHighlight } = useDragParentHighlight();
 *
 * // Highlight a parent by ID
 * highlightParent("parent-block-id");
 *
 * // Highlight by element
 * highlightParent(element);
 *
 * // Clear highlight
 * clearParentHighlight();
 */
export const useDragParentHighlight = () => {
  const [iframe] = useCanvasIframe();
  const innerDoc = useMemo(
    () => (iframe as HTMLIFrameElement)?.contentDocument || (iframe as HTMLIFrameElement)?.contentWindow?.document,
    [iframe],
  );

  /**
   * @FUNCTION highlightParent
   * @description
   * Highlights a parent element during drag operations.
   * Accepts either an HTMLElement or a block ID string.
   * Automatically clears any previous highlight before applying the new one.
   *
   * @param elementOrID - Either an HTMLElement or a block ID string
   */
  const highlightParent = useCallback(
    (elementOrID: HTMLElement | string | null | undefined) => {
      if (!innerDoc) return;

      // Determine the target element first
      let targetElement: HTMLElement | null = null;

      if (!elementOrID) {
        // Clear if null/undefined
        if (lastDragHighlighted) {
          lastDragHighlighted.style.outline = "";
          lastDragHighlighted.style.outlineOffset = "";
          lastDragHighlighted.style.backgroundColor = "";
          lastDragHighlighted.style.position = "";
          lastDragHighlighted = null;
        }
        removeFloatingLabel();
        return;
      }

      if (typeof elementOrID !== "string") {
        // Direct HTMLElement
        targetElement = elementOrID;
      } else {
        // Block ID string - find element in DOM
        targetElement = innerDoc.querySelector(`[data-block-id="${elementOrID}"]`) as HTMLElement;
      }

      // If target is the same as currently highlighted, do nothing (prevent blinking)
      if (targetElement === lastDragHighlighted && floatingLabel && floatingLabel.parentNode) {
        return;
      }

      // Clear previous highlight and label only if changing to a different element
      if (lastDragHighlighted && lastDragHighlighted !== targetElement) {
        lastDragHighlighted.style.outline = "";
        lastDragHighlighted.style.outlineOffset = "";
        lastDragHighlighted.style.backgroundColor = "";
        lastDragHighlighted.style.position = "";
      }
      removeFloatingLabel();

      if (targetElement) {
        // Apply visual highlight styles directly
        targetElement.style.outline = "2px dashed rgba(34, 197, 94, 1)";
        targetElement.style.outlineOffset = "2px";
        targetElement.style.backgroundColor = "rgba(34, 197, 94, 0.05)";

        // Set position relative if not already positioned to allow label positioning
        const currentPosition = window.getComputedStyle(targetElement).position;
        if (currentPosition === "static") {
          targetElement.style.position = "relative";
        }

        // Create and append floating label
        floatingLabel = createFloatingLabel(targetElement, innerDoc);
        targetElement.appendChild(floatingLabel);

        lastDragHighlighted = targetElement;
      } else {
        lastDragHighlighted = null;
      }
    },
    [innerDoc],
  );

  /**
   * @FUNCTION clearParentHighlight
   * @description
   * Clears the parent highlight by removing inline styles and the floating label.
   * Should be called when drag operation ends or when no valid parent is available.
   */
  const clearParentHighlight = useCallback(() => {
    if (lastDragHighlighted) {
      lastDragHighlighted.style.outline = "";
      lastDragHighlighted.style.outlineOffset = "";
      lastDragHighlighted.style.backgroundColor = "";

      // Restore position style if we changed it
      const currentPosition = window.getComputedStyle(lastDragHighlighted).position;
      if (currentPosition === "relative" && lastDragHighlighted.style.position === "relative") {
        lastDragHighlighted.style.position = "";
      }

      lastDragHighlighted = null;
    }

    // Remove floating label
    removeFloatingLabel();
  }, []);

  return {
    highlightParent,
    clearParentHighlight,
    lastDragHighlighted,
  };
};
