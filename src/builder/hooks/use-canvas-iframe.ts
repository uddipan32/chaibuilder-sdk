import { useAtom } from "jotai";
import { canvasIframeAtom } from "~/builder/atoms/ui";

export const useCanvasIframe = () => useAtom(canvasIframeAtom);
