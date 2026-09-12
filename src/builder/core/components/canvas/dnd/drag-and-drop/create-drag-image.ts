/**
 * ============================================================================
 * CREATE DRAG IMAGE UTILITY
 * ============================================================================
 *
 * Utility functions to create custom drag images for drag-and-drop operations.
 * Supports both core blocks (with icon and label) and UI library blocks (with preview image).
 *
 * @module create-drag-image
 */

/**
 * @FUNCTION createCoreDragImage
 * @description
 * Creates a custom drag image for core blocks showing the block icon and label.
 * The image is styled with a semi-transparent background and rounded corners.
 *
 * @param block - The block being dragged (must have type, icon, and label)
 * @returns HTMLElement that can be used as a drag image
 */
export function createCoreDragImage(block: any): HTMLElement {
  const container = document.createElement("div");
  container.className =
    "absolute -top-[1000px] -left-[1000px] pl-3 pr-1 py-1 bg-white/60 border border-blue-400/30 rounded shadow-md flex items-center gap-1.5 font-sans pointer-events-none z-[9999] scale-90";

  // Create icon element
  const type = block.type || block._type || "Box";
  const iconContainer = document.createElement("div");
  iconContainer.className = "w-3 h-3 flex items-center justify-center text-blue-600";

  // Try to render the icon if available
  try {
    if (type === "Image") {
      iconContainer.innerHTML = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 0.72 0.72"><path d="M.57.12H.15a.09.09 0 0 0-.09.09v.3A.09.09 0 0 0 .15.6h.42A.09.09 0 0 0 .66.51v-.3A.09.09 0 0 0 .57.12M.15.54A.03.03 0 0 1 .12.51V.437L.219.338a.03.03 0 0 1 .042 0L.462.54ZM.6.51a.03.03 0 0 1-.03.03H.547L.433.425.459.399a.03.03 0 0 1 .042 0L.6.498Zm0-.097L.544.357a.09.09 0 0 0-.127 0L.391.383.305.297a.09.09 0 0 0-.127 0L.12.353V.21A.03.03 0 0 1 .15.18h.42A.03.03 0 0 1 .6.21Z"/></svg>`;
    } else {
      // Create a simple SVG fallback for icons since we can't use server-side rendering
      iconContainer.innerHTML =
        document.querySelector(`[data-add-core-block-icon="${type}"]`)?.outerHTML ||
        '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"/></svg>';
    }
  } catch {
    // Fallback to text if icon rendering fails
    iconContainer.textContent = "";
  }

  // Create label element
  const label = document.createElement("span");
  label.className = "text-[10px] font-medium text-blue-600 whitespace-nowrap";
  label.textContent = block.label || block.type || block._name || block._type || "Block";

  container.appendChild(iconContainer);
  container.appendChild(label);

  // Append to body temporarily
  document.body.appendChild(container);

  return container;
}

/**
 * @FUNCTION createLibraryDragImage
 * @description
 * Creates a custom drag image for UI library blocks using their preview image.
 * Falls back to a text-based drag image if no preview is available.
 *
 * @param block - The library block being dragged
 * @param previewUrl - Optional preview image URL
 * @returns Promise<HTMLElement> that resolves when the image is loaded
 */
export function createLibraryDragImage(block: any, previewUrl?: string): Promise<HTMLElement> {
  return new Promise((resolve) => {
    if (previewUrl) {
      // Create image-based drag preview
      const container = document.createElement("div");
      container.className =
        "absolute -top-[1000px] -left-[1000px] max-w-[150px] max-h-[100px] border border-blue-400/30 rounded overflow-hidden shadow-md pointer-events-none z-[9999] bg-white/60 scale-90";

      const img = document.createElement("img");
      img.className = "w-full h-full object-cover block";
      img.src = previewUrl;

      img.onload = () => {
        container.appendChild(img);
        document.body.appendChild(container);
        resolve(container);
      };

      img.onerror = () => {
        // Fallback to text-based preview
        const fallback = createTextDragImage(block.name || block.label || "UI Component");
        resolve(fallback);
      };
    } else {
      // No preview URL, use text-based preview
      const fallback = createTextDragImage(block.name || block.label || "UI Component");
      resolve(fallback);
    }
  });
}

/**
 * @FUNCTION createTextDragImage
 * @description
 * Creates a simple text-based drag image as a fallback.
 *
 * @param text - The text to display
 * @returns HTMLElement that can be used as a drag image
 */
function createTextDragImage(text: string): HTMLElement {
  const container = document.createElement("div");
  container.className =
    "absolute -top-[1000px] -left-[1000px] px-2 py-1 bg-white/60 border border-blue-400/30 rounded shadow-md font-sans text-[10px] font-medium text-gray-900 whitespace-nowrap pointer-events-none z-[9999] scale-90";
  container.textContent = text;
  document.body.appendChild(container);
  return container;
}

/**
 * @FUNCTION cleanupDragImage
 * @description
 * Removes the custom drag image from the DOM after drag operation completes.
 *
 * @param element - The drag image element to remove
 */
export function cleanupDragImage(element: HTMLElement | null) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}
