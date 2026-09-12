/**
 * Live canvas preview for AI-streamed HTML.
 *
 * While tool input (edit_block / add_blocks html) streams in, the partial HTML
 * is rendered into a temporary element inside the canvas iframe so the user
 * sees the section paint in real time. The temp elements are marked with
 * `data-stream-canvas` and removed once the real blocks are committed to the
 * builder state (or on abort/error).
 */

const getIframeDocument = (): Document | null => {
  const iframe = document.getElementById("canvas-iframe") as HTMLIFrameElement | null;
  return iframe?.contentDocument ?? null;
};

/** bids of blocks hidden during edit preview, so aborts can restore them. */
const hiddenBlockIds = new Set<string>();

/**
 * Key of the tool call currently owning the preview element. Streaming ticks
 * for the same tool call update the existing element's innerHTML instead of
 * destroying and recreating it — the canvas container is React-managed, so we
 * keep foreign-DOM churn to a minimum.
 */
let activePreviewKey: string | null = null;

const removeExistingCanvases = (iframeDocument: Document) => {
  iframeDocument.querySelectorAll("[data-stream-canvas]").forEach((canvas) => canvas.remove());
};

const scrollElementIntoView = (element: HTMLElement) => {
  // Always scroll to keep the bottom of the element in view as content streams
  element.scrollIntoView({ behavior: "smooth", block: "end" });
};

const getCanvasElement = (parentId?: string, position?: number): HTMLElement | null => {
  const iframeDocument = getIframeDocument();
  if (!iframeDocument) return null;

  removeExistingCanvases(iframeDocument);

  let targetContainer: HTMLElement | null = null;
  if (parentId && parentId !== "undefined") {
    targetContainer = iframeDocument.querySelector(`[data-block-id="${parentId}"]`);
  }
  if (!targetContainer) {
    targetContainer = iframeDocument.querySelector(`[data-block-id="canvas"]`);
  }
  if (!targetContainer) return null;

  const canvasElement = iframeDocument.createElement("div");
  canvasElement.setAttribute("data-stream-canvas", "true");

  if (position !== undefined && position >= 0 && targetContainer.children) {
    const insertIndex = Math.min(position, targetContainer.children.length);
    if (insertIndex < targetContainer.children.length) {
      targetContainer.insertBefore(canvasElement, targetContainer.children[insertIndex]);
    } else {
      targetContainer.appendChild(canvasElement);
    }
  } else {
    targetContainer.appendChild(canvasElement);
  }

  return canvasElement;
};

const getCanvasElementForEdit = (blockId: string): HTMLElement | null => {
  const iframeDocument = getIframeDocument();
  if (!iframeDocument) return null;

  removeExistingCanvases(iframeDocument);

  const targetBlock = iframeDocument.querySelector(`[data-block-id="${blockId}"]`);
  if (!targetBlock) return null;

  const canvasElement = iframeDocument.createElement("div");
  canvasElement.setAttribute("data-stream-canvas", "true");
  targetBlock.parentNode?.insertBefore(canvasElement, targetBlock.nextSibling);

  // Hide the original block during streaming; restored by clearStreamCanvas
  (targetBlock as HTMLElement).style.display = "none";
  hiddenBlockIds.add(blockId);

  return canvasElement;
};

const getExistingPreviewElement = (key: string): HTMLElement | null => {
  if (activePreviewKey !== key) return null;
  const iframeDocument = getIframeDocument();
  const element = iframeDocument?.querySelector("[data-stream-canvas]") as HTMLElement | null;
  return element && element.isConnected ? element : null;
};

export const streamHtmlToCanvasForAdd = (html: string, parentId?: string, position?: number, key = "add") => {
  const element = getExistingPreviewElement(key) ?? getCanvasElement(parentId, position);
  if (element) {
    activePreviewKey = key;
    element.innerHTML = html;
    scrollElementIntoView(element);
  }
};

export const streamHtmlToCanvasForEdit = (html: string, blockId: string, key = "edit") => {
  const element = getExistingPreviewElement(key) ?? getCanvasElementForEdit(blockId);
  if (element) {
    activePreviewKey = key;
    element.innerHTML = html;
    scrollElementIntoView(element);
  }
};

/**
 * Remove all temp preview elements and unhide blocks hidden by edit previews.
 * Safe to call repeatedly (idempotent) — used after each applied tool call and
 * on finish/abort/error.
 */
export const clearStreamCanvas = () => {
  activePreviewKey = null;
  const iframeDocument = getIframeDocument();
  if (!iframeDocument) {
    hiddenBlockIds.clear();
    return;
  }

  removeExistingCanvases(iframeDocument);

  hiddenBlockIds.forEach((blockId) => {
    const block = iframeDocument.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    if (block) block.style.display = "";
  });
  hiddenBlockIds.clear();
};
