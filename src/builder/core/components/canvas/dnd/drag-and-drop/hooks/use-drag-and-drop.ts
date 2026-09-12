/**
 * ============================================================================
 * DRAG AND DROP STATE MANAGEMENT
 * ============================================================================
 *
 * This file contains all the Jotai atoms used for managing drag and drop state
 * across the visual builder. These atoms are shared between all drag and drop hooks.
 *
 * @module use-drag-and-drop
 */

import { atom } from "jotai";
import { ChaiBlock } from "~/types/common";

/**
 * Atom to store the currently dragged block
 * Contains either a new block (with just type) or an existing block (full data)
 */
export const dragAndDropAtom = atom<ChaiBlock | null>(null);

/**
 * Interface for drop indicator state
 * Controls the visual placeholder shown during drag operations
 */
export interface DropIndicatorState {
  /** Whether the placeholder is visible */
  isVisible: boolean;
  /** Whether the current drop position is valid */
  isValid: boolean;
  /** Position relative to target: before, after, or inside */
  position: "before" | "after" | "inside";
  /** Orientation of the placeholder line: horizontal or vertical */
  placeholderOrientation: "horizontal" | "vertical";
  /** Whether the target container is empty */
  isEmpty: boolean;
  /** Top position in pixels */
  top: number;
  /** Left position in pixels */
  left: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** ID of the target block where drop will occur */
  targetBlockId?: string;
  /** ID of the target block's parent */
  targetParentId?: string;
  /** Whether this is a gap zone between elements */
  isGapZone?: boolean;
}

/**
 * Atom to store the drop indicator state
 * Controls the visual feedback during drag operations
 */
export const dropIndicatorAtom = atom<DropIndicatorState>({
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

/**
 * Global flag to track if a drag operation is currently active
 * Used to prevent race conditions and optimize performance
 */
export let isDragging = false;

/**
 * Set the dragging state
 * @param value - Whether dragging is active
 */
export const setIsDragging = (value: boolean) => {
  isDragging = value;
};

/**
 * Atom to force re-render of canvas after drag operations
 * Incremented on drag end to trigger component updates
 */
export const canvasRenderKeyAtom = atom<number>(0);
