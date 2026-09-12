import { useAtom } from "jotai";
import { styleBreakpointAtom } from "~/builder/hooks/use-selected-blockIds";

export const useStylingBreakpoint = () => useAtom(styleBreakpointAtom);
