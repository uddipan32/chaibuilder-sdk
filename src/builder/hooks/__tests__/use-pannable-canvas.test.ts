/**
 * @vitest-environment happy-dom
 */
import { builderStore } from "~/builder/atoms/store";
import { canvasZoomAtom } from "~/builder/hooks/use-canvas-zoom";
import {
  CANVAS_SIDE_MARGIN,
  CANVAS_TOP_MARGIN,
  canvasContentHeightAtom,
  canvasPanAtom,
  canvasWrapperSizeAtom,
  clampPanX,
  clampPanY,
  fitZoom,
  initialPanX,
  MIN_ZOOM,
  panCanvasToRevealLocalRect,
  pannableCanvasAtom,
  zoomCanvasAtPoint,
} from "~/builder/hooks/use-pannable-canvas";
import { canvasDisplayWidthAtom } from "~/builder/hooks/use-screen-size-width";

const VIEWPORT = { width: 900, height: 500 };

// Reveal tests start from the explicit default pan (x: 0); a reveal that only
// moves vertically leaves x untouched, so the x assertions stay simple. (At
// canvasWidth === viewport the artboard is not pinned — it can pan
// +/- CANVAS_SIDE_MARGIN — but these tests never drive it there.) Cases that
// need a specific artboard width pass canvasWidth explicitly.
const setup = ({ zoom = 100, pan = { x: 0, y: CANVAS_TOP_MARGIN }, canvasWidth = 900, contentHeight = 4000 } = {}) => {
  builderStore.set(canvasWrapperSizeAtom, VIEWPORT);
  builderStore.set(canvasZoomAtom, zoom);
  builderStore.set(canvasPanAtom, pan);
  builderStore.set(canvasDisplayWidthAtom, canvasWidth);
  builderStore.set(canvasContentHeightAtom, contentHeight);
};

describe("pannableCanvasAtom", () => {
  it("is off by default", () => {
    expect(builderStore.get(pannableCanvasAtom)).toBe(false);
  });

  it("persists to sessionStorage, not localStorage, so a new session starts back on the plain canvas", () => {
    builderStore.set(pannableCanvasAtom, true);
    expect(sessionStorage.getItem("pannableCanvas")).toBe("true");
    expect(localStorage.getItem("pannableCanvas")).toBeNull();
    builderStore.set(pannableCanvasAtom, false);
  });
});

describe("fitZoom", () => {
  it("scales a breakpoint wider than the viewport down to fit (2XL in a 900px viewport)", () => {
    expect(fitZoom(1920, 900)).toBe(46);
    expect(1920 * 0.46).toBeLessThanOrEqual(900);
  });

  it("never zooms above 1:1 for breakpoints that already fit", () => {
    expect(fitZoom(800, 900)).toBe(100);
    expect(fitZoom(900, 900)).toBe(100);
  });

  it("floors instead of rounding so the artboard can't end up wider than the viewport", () => {
    // 900 / 1420 = 63.38% -> 63, not 64 (1420 * 0.64 = 908.8 > 900)
    expect(fitZoom(1420, 900)).toBe(63);
  });

  it("respects the minimum zoom and tolerates unmeasured sizes", () => {
    expect(fitZoom(1920, 300)).toBe(MIN_ZOOM);
    expect(fitZoom(1920, 0)).toBe(100);
    expect(fitZoom(0, 900)).toBe(100);
  });
});

describe("clampPanX / clampPanY (scroll-container viewport)", () => {
  it("pins a narrower artboard centered — it cannot be dragged sideways", () => {
    // fits with a margin on each side (800 <= 900 - 2*24) -> centered
    expect(clampPanX(0, 800, 900)).toBe(50);
    expect(clampPanX(-300, 800, 900)).toBe(50);
    expect(clampPanX(300, 800, 900)).toBe(50);
  });

  it("lets a wider artboard pan between its edges, keeping a margin strip at each extreme", () => {
    // left extreme: artboard sits CANVAS_SIDE_MARGIN in from the viewport's left
    expect(clampPanX(999, 1920, 900)).toBe(CANVAS_SIDE_MARGIN);
    // right extreme: same strip of canvas on the right
    expect(clampPanX(-9999, 1920, 900)).toBe(900 - 1920 - CANVAS_SIDE_MARGIN);
    // free to pan in between
    expect(clampPanX(-500, 1920, 900)).toBe(-500);
  });

  it("pins a shorter artboard to the top margin", () => {
    expect(clampPanY(-100, 300, 500)).toBe(CANVAS_TOP_MARGIN);
    expect(clampPanY(400, 300, 500)).toBe(CANVAS_TOP_MARGIN);
  });

  it("lets a taller artboard scroll between top margin and bottom margin, never off-screen", () => {
    expect(clampPanY(100, 4000, 500)).toBe(CANVAS_TOP_MARGIN);
    expect(clampPanY(-1000, 4000, 500)).toBe(-1000);
    expect(clampPanY(-99999, 4000, 500)).toBe(500 - 4000 - CANVAS_TOP_MARGIN);
  });

  it("starts a wider artboard at the left margin, not centered-and-clipped", () => {
    expect(initialPanX(1920, 900)).toBe(CANVAS_SIDE_MARGIN);
    expect(initialPanX(800, 900)).toBe(50);
  });
});

describe("panCanvasToRevealLocalRect", () => {
  it("leaves the pan alone when the block is fully visible", () => {
    setup();
    panCanvasToRevealLocalRect({ top: 100, left: 100, width: 200, height: 100 });
    expect(builderStore.get(canvasPanAtom)).toEqual({ x: 0, y: CANVAS_TOP_MARGIN });
  });

  it("treats a partially visible block as visible (same rule as the non-pannable selection scroll)", () => {
    setup();
    // bottom edge of the viewport cuts through the block
    panCanvasToRevealLocalRect({ top: 450, left: 100, width: 200, height: 100 });
    expect(builderStore.get(canvasPanAtom)).toEqual({ x: 0, y: CANVAS_TOP_MARGIN });
  });

  it("pans vertically to center a block that is below the viewport", () => {
    setup();
    panCanvasToRevealLocalRect({ top: 2000, left: 100, width: 200, height: 100 });
    const pan = builderStore.get(canvasPanAtom);
    expect(pan.x).toBe(0);
    // block centered: viewport top = 2000 + pan.y = (500 - 100) / 2
    expect(pan.y + 2000).toBe(200);
  });

  it("accounts for zoom when mapping iframe-local coordinates", () => {
    setup({ zoom: 50 });
    panCanvasToRevealLocalRect({ top: 2000, left: 100, width: 200, height: 100 });
    const pan = builderStore.get(canvasPanAtom);
    // scaled block: top 1000, height 50 -> centered at (500 - 50) / 2 = 225
    expect(pan.y + 1000).toBe(225);
  });

  it("pans horizontally only when the block is fully off-screen on that axis", () => {
    setup({ canvasWidth: 1920, pan: { x: -510, y: CANVAS_TOP_MARGIN } });
    // block at local x 1700..1900 -> viewport x 1190..1390, beyond the 900px viewport.
    // Centering would need pan.x = -1350; the artboard's right edge + margin clamps
    // it, still bringing the block fully into view.
    panCanvasToRevealLocalRect({ top: 100, left: 1700, width: 200, height: 100 });
    const pan = builderStore.get(canvasPanAtom);
    expect(pan.y).toBe(CANVAS_TOP_MARGIN);
    expect(pan.x).toBe(900 - 1920 - CANVAS_SIDE_MARGIN);
    expect(pan.x + 1900).toBeLessThanOrEqual(900);
  });

  it("aligns a block taller than the viewport to the top margin instead of centering it", () => {
    setup();
    panCanvasToRevealLocalRect({ top: 2000, left: 0, width: 800, height: 1200 });
    expect(builderStore.get(canvasPanAtom).y + 2000).toBe(CANVAS_TOP_MARGIN);
  });

  it("aligns a block wider than the viewport flush with the left edge (no horizontal margin)", () => {
    setup({ canvasWidth: 4000 });
    // off-screen to the right and 1200px wide in a 900px viewport
    panCanvasToRevealLocalRect({ top: 100, left: 2000, width: 1200, height: 100 });
    const pan = builderStore.get(canvasPanAtom);
    expect(pan.x + 2000).toBe(0);
    expect(pan.y).toBe(CANVAS_TOP_MARGIN);
  });

  it("never pans the artboard past its bottom edge", () => {
    setup({ contentHeight: 1500 });
    panCanvasToRevealLocalRect({ top: 2000, left: 100, width: 200, height: 100 });
    // centering would need pan.y = -1800; the clamp stops with the artboard's bottom at the bottom margin
    expect(builderStore.get(canvasPanAtom).y).toBe(500 - 1500 - CANVAS_TOP_MARGIN);
  });

  it("is a no-op before the viewport has been measured", () => {
    setup();
    builderStore.set(canvasWrapperSizeAtom, { width: 0, height: 0 });
    panCanvasToRevealLocalRect({ top: 2000, left: 100, width: 200, height: 100 });
    expect(builderStore.get(canvasPanAtom)).toEqual({ x: 0, y: CANVAS_TOP_MARGIN });
  });
});

describe("zoomCanvasAtPoint (persisted-zoom hardening)", () => {
  it("clamps a persisted out-of-range zoom before using it as a divisor", () => {
    setup({ pan: { x: 5, y: 7 } });
    // e.g. 0 persisted before the wrapper was measured. It is clamped to
    // MIN_ZOOM, so requesting MIN_ZOOM is a no-op (z1 === z2) instead of a
    // ratio = z2 / 0 = Infinity that would snap the canvas to an edge.
    builderStore.set(canvasZoomAtom, 0);
    zoomCanvasAtPoint(MIN_ZOOM, 450, 250);
    expect(builderStore.get(canvasPanAtom)).toEqual({ x: 5, y: 7 });
  });
});
