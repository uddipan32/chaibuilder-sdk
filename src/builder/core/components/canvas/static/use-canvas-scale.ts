import { useEffect, useMemo } from "react";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useCanvasZoom } from "~/builder/hooks/use-canvas-zoom";
import { useCanvasDisplayWidth } from "~/builder/hooks/use-screen-size-width";

export const useCanvasScale = (
  dimension: { height: number; width: number },
  options?: { disabled?: boolean },
) => {
  const disabled = options?.disabled ?? false;
  const [canvasWidth] = useCanvasDisplayWidth();
  const [, setZoom] = useCanvasZoom();
  const htmlDir = useBuilderProp("htmlDir", "ltr") as "ltr" | "rtl";

  const scale = useMemo(() => {
    if (disabled) return {};
    const { width, height } = dimension;
    // width is 0 until the wrapper is measured — scaling to 0 would compute
    // a scale(0) transform and (below) persist zoom=0.
    if (width > 0 && width < canvasWidth) {
      const newScale: number = parseFloat((width / canvasWidth).toFixed(2).toString());
      let heightObj = {};
      const scaledHeight = height * newScale;
      const scaledWidth = width * newScale;
      if (height) {
        heightObj = {
          // Eureka! This is the formula to calculate the height of the scaled element. Thank you ChatGPT 4
          height: 100 + ((height - scaledHeight) / scaledHeight) * 100 + "%",
          width: 100 + ((width - scaledWidth) / scaledWidth) * 100 + "%",
        };
      }
      return {
        position: "relative",
        top: 0,
        transform: `scale(${newScale})`,
        transformOrigin: htmlDir === "rtl" ? "top right" : "top left",
        ...heightObj,
        maxWidth: "none", // TODO: Add max-width to the wrapper
      };
    }
    return {};
  }, [canvasWidth, dimension, htmlDir, disabled]);

  useEffect(() => {
    if (disabled) return;
    const { width } = dimension;
    if (!width) return;
    if (width < canvasWidth) {
      const newScale: number = parseFloat((width / canvasWidth).toFixed(2).toString());
      setZoom(newScale * 100);
    } else {
      setZoom(100);
    }
  }, [canvasWidth, dimension, setZoom, disabled]);

  return scale;
};
