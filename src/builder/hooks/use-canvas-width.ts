import { useEffect, useMemo, useState } from "react";

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: ReadonlyArray<{ name: BreakpointName; minWidth: number }> = [
  { name: "xs", minWidth: 0 },
  { name: "sm", minWidth: 640 },
  { name: "md", minWidth: 768 },
  { name: "lg", minWidth: 1024 },
  { name: "xl", minWidth: 1280 },
  { name: "2xl", minWidth: 1536 },
];

const getBreakpointForWidth = (width: number): BreakpointName => {
  for (let index = BREAKPOINTS.length - 1; index >= 0; index -= 1) {
    const breakpoint = BREAKPOINTS[index];
    if (width >= breakpoint.minWidth) {
      return breakpoint.name;
    }
  }

  return BREAKPOINTS[0].name;
};

export const useCanvasWidth = (): readonly [number, BreakpointName] => {
  const initialWidth = typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS[0].minWidth;

  const [width, setWidth] = useState<number>(initialWidth);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentBreakpoint = useMemo(() => getBreakpointForWidth(width), [width]);

  return [width, currentBreakpoint] as const;
};
