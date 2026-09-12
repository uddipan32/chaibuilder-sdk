import { useEffect, useRef } from "react";
import { panCanvasBy, useCanvasSpacePressed, useCanvasTool } from "~/builder/hooks/use-pannable-canvas";

/**
 * Rendered in the parent DOM above the canvas iframe, active while the hand
 * tool is selected or space is held. Because it sits over the iframe, a pan
 * drag can never fall through to block selection, DnD, or text editing.
 */
export const PanZoomOverlay = () => {
  const [tool] = useCanvasTool();
  const [spacePressed] = useCanvasSpacePressed();
  const draggingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      panCanvasBy(e.movementX, e.movementY);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (tool !== "hand" && !spacePressed) return null;

  return (
    <div
      // z-40 keeps the overlay above the iframe but below dropdowns/popovers
      // (z-50), so menus opened over the canvas stay clickable in hand mode.
      className="absolute inset-0 z-40 cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};
