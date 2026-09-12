import { atom, useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { builderStore } from "~/builder/atoms/store";
import { canvasZoomAtom } from "~/builder/hooks/use-canvas-zoom";
import { canvasDisplayWidthAtom } from "~/builder/hooks/use-screen-size-width";

export type CanvasTool = "select" | "hand";

// Off by default and remembered for the working session only (sessionStorage):
// the mode changes what scrolling and breakpoint switches do, so a fresh
// browser session must start back on the plain canvas instead of wherever an
// earlier session left it. The storage getter is lazy so the
// atom is safe to construct where `window` is absent.
export const pannableCanvasAtom = atomWithStorage(
  "pannableCanvas",
  false,
  createJSONStorage<boolean>(() => sessionStorage),
);
export const canvasToolAtom = atom<CanvasTool>("select");
export const canvasPanAtom = atom({ x: 0, y: 0 });
export const canvasSpacePressedAtom = atom(false);
export const canvasWrapperSizeAtom = atom({ width: 0, height: 0 });
export const canvasContentHeightAtom = atom(800);

export const MIN_ZOOM = 25;
export const MAX_ZOOM = 400;
export const CANVAS_TOP_MARGIN = 24;
// Slack on the left/right edges, mirroring the top/bottom margin. At a
// horizontal extreme a strip of empty canvas shows beside the artboard so the
// user can tell they've reached the edge. It sits OUTSIDE the artboard, so
// unlike the old centered-and-clipped layout it never hides real content.
// This is an independent pan-slack value, NOT the layout gutter width: it only
// controls how far past its edge the artboard can pan, so it can be tuned
// freely without touching the wrapper's gutter-covering CSS.
export const CANVAS_SIDE_MARGIN = 24;

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

// The viewport behaves like a scroll container, not a free canvas: the
// artboard can never be panned past its own edges + margin (no empty void
// beyond the margin, no dragging it off-screen), and on an axis where it fits
// within the viewport minus its margins it is pinned — centered horizontally,
// top-aligned vertically. Zoomed in, the viewport is a window you pan within,
// exactly like scrolling; zoomed out, the whole artboard sits inside — framed
// left and right by an equal margin strip, and by the top margin above (a
// page shorter than the viewport keeps that top margin and leaves the rest of
// the gap below it, the way a page sits at the top of a scroll area).
export const clampPanX = (pan: number, scaledWidth: number, viewportWidth: number) => {
  const min = viewportWidth - scaledWidth - CANVAS_SIDE_MARGIN; // right edge + margin
  const max = CANVAS_SIDE_MARGIN; // left edge + margin
  if (min >= max) return (viewportWidth - scaledWidth) / 2;
  return Math.min(Math.max(pan, min), max);
};

export const clampPanY = (pan: number, scaledHeight: number, viewportHeight: number) => {
  const min = viewportHeight - scaledHeight - CANVAS_TOP_MARGIN;
  if (min >= CANVAS_TOP_MARGIN) return CANVAS_TOP_MARGIN;
  return Math.min(Math.max(pan, min), CANVAS_TOP_MARGIN);
};

// Where the artboard starts horizontally: centered when it fits, or at the
// left margin (a strip of canvas showing to its left) when it is wider than
// the viewport — never centered-and-clipped on both sides.
export const initialPanX = (scaledWidth: number, viewportWidth: number) =>
  clampPanX(CANVAS_SIDE_MARGIN, scaledWidth, viewportWidth);

// Zoom that fits the artboard width inside the viewport, never above 1:1 —
// the same rule auto-fit applies outside pannable mode. Floored so rounding
// can never leave the artboard a few pixels wider than the viewport.
export const fitZoom = (canvasWidth: number, viewportWidth: number) => {
  if (canvasWidth <= 0 || viewportWidth <= 0) return 100;
  return clampZoom(Math.min(100, Math.floor((viewportWidth / canvasWidth) * 100)));
};

const getCanvasScaledSize = (zoomPct: number) => {
  const z = clampZoom(zoomPct) / 100;
  return {
    width: builderStore.get(canvasDisplayWidthAtom) * z,
    height: builderStore.get(canvasContentHeightAtom) * z,
  };
};

/**
 * Imperative pan/zoom actions operating on the global store so native event
 * handlers (wheel, drag) can call them without stale-closure or re-render
 * churn concerns. All screen coordinates are relative to the canvas
 * viewport (the wrapper that clips the artboard).
 */
export const panCanvasBy = (dx: number, dy: number) => {
  const viewport = builderStore.get(canvasWrapperSizeAtom);
  const scaled = getCanvasScaledSize(builderStore.get(canvasZoomAtom));
  const prev = builderStore.get(canvasPanAtom);
  builderStore.set(canvasPanAtom, {
    x: clampPanX(prev.x + dx, scaled.width, viewport.width),
    y: clampPanY(prev.y + dy, scaled.height, viewport.height),
  });
};

/**
 * Pan so a block (rect in unscaled iframe-local coordinates) is visible in the
 * viewport — what scrollIntoView does for a scrolling canvas. Partially
 * visible counts as visible, matching the selection-scroll rule outside
 * pannable mode: an axis only moves when the block is fully off-screen on it,
 * and then the block is centered (or, when it is taller/wider than the
 * viewport, aligned to the top margin / flush with the left edge — there is
 * no horizontal margin in the layout).
 */
export const panCanvasToRevealLocalRect = (rect: { top: number; left: number; width: number; height: number }) => {
  const viewport = builderStore.get(canvasWrapperSizeAtom);
  if (!viewport.width || !viewport.height) return;
  const z = clampZoom(builderStore.get(canvasZoomAtom)) / 100;
  const pan = builderStore.get(canvasPanAtom);
  const axisDelta = (start: number, size: number, viewportSize: number, edgeMargin: number) => {
    if (start + size > 0 && start < viewportSize) return 0;
    if (size >= viewportSize) return edgeMargin - start;
    return (viewportSize - size) / 2 - start;
  };
  const dx = axisDelta(pan.x + rect.left * z, rect.width * z, viewport.width, 0);
  const dy = axisDelta(pan.y + rect.top * z, rect.height * z, viewport.height, CANVAS_TOP_MARGIN);
  if (dx || dy) panCanvasBy(dx, dy);
};

export const zoomCanvasAtPoint = (nextZoomPct: number, sX: number, sY: number) => {
  // Clamp the persisted zoom before using it: canvasZoomAtom is stored without
  // clamping (a 0 can be persisted before the wrapper is measured), and it is
  // the divisor in `ratio = z2 / z1` below — an unclamped 0 makes ratio
  // Infinity and snaps the canvas to an edge instead of zooming at the cursor.
  const z1 = clampZoom(builderStore.get(canvasZoomAtom));
  const z2 = clampZoom(nextZoomPct);
  if (z1 === z2) return;
  const viewport = builderStore.get(canvasWrapperSizeAtom);
  const scaled = getCanvasScaledSize(z2);
  const prev = builderStore.get(canvasPanAtom);
  const ratio = z2 / z1;
  builderStore.set(canvasPanAtom, {
    x: clampPanX(sX - (sX - prev.x) * ratio, scaled.width, viewport.width),
    y: clampPanY(sY - (sY - prev.y) * ratio, scaled.height, viewport.height),
  });
  builderStore.set(canvasZoomAtom, z2);
};

// For events originating inside the canvas iframe: clientX/clientY there are
// in unscaled iframe-local coordinates, so map through the transform first.
export const zoomCanvasAtLocalPoint = (nextZoomPct: number, xLocal: number, yLocal: number) => {
  const z1 = clampZoom(builderStore.get(canvasZoomAtom)) / 100;
  const prev = builderStore.get(canvasPanAtom);
  zoomCanvasAtPoint(nextZoomPct, prev.x + z1 * xLocal, prev.y + z1 * yLocal);
};

export const zoomCanvasAtCenter = (nextZoomPct: number) => {
  const viewport = builderStore.get(canvasWrapperSizeAtom);
  zoomCanvasAtPoint(nextZoomPct, viewport.width / 2, viewport.height / 2);
};

export const resetCanvasZoomPan = () => {
  const viewport = builderStore.get(canvasWrapperSizeAtom);
  const canvasWidth = builderStore.get(canvasDisplayWidthAtom);
  builderStore.set(canvasZoomAtom, 100);
  builderStore.set(canvasPanAtom, {
    x: initialPanX(canvasWidth, viewport.width),
    y: CANVAS_TOP_MARGIN,
  });
};

export const isEditableTarget = (target: EventTarget | null) => {
  const el = target as any;
  if (!el || typeof el.tagName !== "string") return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    !!el.isContentEditable ||
    !!el.closest?.('[contenteditable="true"]')
  );
};

/**
 * Wrapper hooks around useAtom
 */
export const usePannableCanvas = () => useAtom(pannableCanvasAtom);
export const useCanvasTool = () => useAtom(canvasToolAtom);
export const useCanvasPan = () => useAtom(canvasPanAtom);
export const useCanvasSpacePressed = () => useAtom(canvasSpacePressedAtom);
export const useCanvasWrapperSize = () => useAtom(canvasWrapperSizeAtom);
export const useCanvasContentHeight = () => useAtom(canvasContentHeightAtom);
