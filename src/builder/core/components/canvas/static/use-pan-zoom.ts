import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import { builderStore } from "~/builder/atoms/store";
import { canvasZoomAtom, useCanvasZoom } from "~/builder/hooks/use-canvas-zoom";
import {
  CANVAS_TOP_MARGIN,
  canvasPanAtom,
  canvasSpacePressedAtom,
  canvasToolAtom,
  canvasWrapperSizeAtom,
  clampPanY,
  clampZoom,
  fitZoom,
  initialPanX,
  isEditableTarget,
  panCanvasBy,
  useCanvasContentHeight,
  useCanvasPan,
  usePannableCanvas,
  zoomCanvasAtPoint,
} from "~/builder/hooks/use-pannable-canvas";
import { useCanvasDisplayWidth } from "~/builder/hooks/use-screen-size-width";

type Dimension = { width: number; height: number };

/**
 * Drives the Figma-style artboard mode: the canvas iframe is laid out at the
 * breakpoint width x its full content height and moved around the fixed
 * viewport with a single translate+scale transform. Keeping the transform on
 * the iframe element itself means the browser maps pointer coordinates for
 * us, so selection/highlight/DnD inside the iframe need no compensation.
 */
export const usePanZoom = ({
  dimension,
  wrapperRef,
}: {
  dimension: Dimension;
  wrapperRef: RefObject<HTMLDivElement | null>;
}) => {
  const [pannable] = usePannableCanvas();
  const [canvasWidth] = useCanvasDisplayWidth();
  const [zoom] = useCanvasZoom();
  const [pan] = useCanvasPan();
  const [contentHeight] = useCanvasContentHeight();
  const wasPannableRef = useRef(pannable);

  // Publish the viewport size so topbar zoom controls and the imperative
  // pan/zoom actions can clamp against it without a ref to the wrapper.
  // Re-measured on mode toggle too: the wrapper widens over the side gutters
  // while pannable (see StaticCanvas), which `dimension` does not track.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    builderStore.set(canvasWrapperSizeAtom, { width: el.clientWidth, height: el.clientHeight });
  }, [dimension, wrapperRef, pannable]);

  // Enter/exit pannable mode. On entry fit the artboard to the viewport width
  // (never above 1:1 — this is the zoom auto-fit already applied, so the
  // canvas doesn't visually jump) and position it via initialPanX (centered
  // when it fits, at the left margin when it is wider than the viewport); on
  // exit reset everything so auto-fit takes over cleanly.
  useEffect(() => {
    if (pannable && !wasPannableRef.current) {
      const viewportWidth = wrapperRef.current?.clientWidth ?? 0;
      const zoom = fitZoom(canvasWidth, viewportWidth);
      builderStore.set(canvasZoomAtom, zoom);
      builderStore.set(canvasPanAtom, {
        x: initialPanX((canvasWidth * zoom) / 100, viewportWidth),
        y: CANVAS_TOP_MARGIN,
      });
    } else if (!pannable && wasPannableRef.current) {
      builderStore.set(canvasPanAtom, { x: 0, y: 0 });
      builderStore.set(canvasToolAtom, "select");
      builderStore.set(canvasSpacePressedAtom, false);
    }
    wasPannableRef.current = pannable;
  }, [pannable]);

  // Breakpoint switch while pannable: refit to the viewport width and
  // reposition (initialPanX: centered if it fits, else at the left margin), as
  // auto-fit does outside the mode. Keeping the previous zoom left a wider
  // breakpoint (e.g. 2XL at 100%) clipped on both sides of the viewport, with
  // no hint that the canvas was simply larger than the screen.
  useEffect(() => {
    if (!pannable) return;
    const viewport = builderStore.get(canvasWrapperSizeAtom);
    const zoom = fitZoom(canvasWidth, viewport.width);
    const z = zoom / 100;
    const prev = builderStore.get(canvasPanAtom);
    builderStore.set(canvasZoomAtom, zoom);
    builderStore.set(canvasPanAtom, {
      x: initialPanX(canvasWidth * z, viewport.width),
      y: clampPanY(prev.y, contentHeight * z, viewport.height),
    });
  }, [canvasWidth]);

  // Wrapper resize / content height change: re-clamp so the canvas stays
  // reachable. panCanvasBy(0,0) is a pure clamp.
  useEffect(() => {
    if (!pannable) return;
    panCanvasBy(0, 0);
  }, [pannable, dimension, contentHeight]);

  // The mode is entered only via the canvas topbar menu switch. There is
  // deliberately no hotkey: the upstream bare `P` toggle was the only
  // modifier-less global shortcut in the builder and switched users into a
  // mode they didn't know existed. V/H/Space below only apply once inside.
  // Parent-side gestures: wheel pan/zoom over the backdrop and gutters, and
  // keyboard shortcuts (space = temporary hand, V/H = switch tool) when
  // focus is outside the iframe. Equivalent in-iframe listeners live in
  // PanZoomHandler because iframe events never bubble to the parent.
  useEffect(() => {
    if (!pannable) return;
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = wrapperEl.getBoundingClientRect();
        const nextZoom = clampZoom(builderStore.get(canvasZoomAtom) * Math.exp(-e.deltaY * 0.01));
        zoomCanvasAtPoint(nextZoom, e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }
      panCanvasBy(-dx, -dy);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === "Space") {
        if (!e.repeat) {
          e.preventDefault();
          builderStore.set(canvasSpacePressedAtom, true);
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "v" || e.key === "V" || e.key === "Escape") builderStore.set(canvasToolAtom, "select");
      if (e.key === "h" || e.key === "H") builderStore.set(canvasToolAtom, "hand");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") builderStore.set(canvasSpacePressedAtom, false);
    };

    wrapperEl.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      wrapperEl.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [pannable, wrapperRef]);

  const style = useMemo(() => {
    if (!pannable) return null;
    // Clamp defensively: a zoom outside bounds (e.g. 0 persisted before the
    // wrapper was measured) would render the canvas invisible.
    const z = clampZoom(zoom) / 100;
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: `${canvasWidth}px`,
      height: `${Math.max(contentHeight, 100)}px`,
      maxWidth: "none",
      margin: 0,
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${z})`,
      transformOrigin: "0 0",
    };
  }, [pannable, zoom, pan, canvasWidth, contentHeight]);

  return { enabled: pannable, style };
};
