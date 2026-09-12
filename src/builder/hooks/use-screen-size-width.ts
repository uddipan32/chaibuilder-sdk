import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";
import { getBreakpointValue } from "~/builder/core/functions/common-functions";
import { useStylingBreakpoint } from "~/builder/hooks/use-styling-breakpoint";

export const canvasWidthAtom = atomWithStorage("canvasWidth", 800);
export const canvasDisplayWidthAtom = atomWithStorage("canvasDisplayWidth", 800);

export const canvasBreakpointAtom = atom((get) => {
  const width: number = get(canvasWidthAtom);
  return getBreakpointValue(width).toLowerCase();
});

/**
 *
 */
export const useScreenSizeWidth = () => {
  const [currentWidth, setCanvasWidth] = useAtom(canvasWidthAtom);
  const breakpoint = useAtomValue(canvasBreakpointAtom);
  const [stylingBreakpoint, setStylingBreakpoint] = useStylingBreakpoint();

  useEffect(() => {
    if (stylingBreakpoint !== "xs") {
      setStylingBreakpoint(breakpoint);
    }
  }, [breakpoint, stylingBreakpoint, setStylingBreakpoint]);

  return [currentWidth, breakpoint, setCanvasWidth] as const;
};

export const useCanvasDisplayWidth = () => {
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useAtom(canvasDisplayWidthAtom);
  return [canvasDisplayWidth, setCanvasDisplayWidth] as const;
};
