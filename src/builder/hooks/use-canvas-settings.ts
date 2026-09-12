import { useAtom } from "jotai";
import { canvasSettingsAtom } from "~/builder/atoms/ui";

export const useCanvasSettings = () => {
  return useAtom(canvasSettingsAtom);
};
