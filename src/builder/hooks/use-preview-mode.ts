import { atom, useAtom } from "jotai";

const previewModeAtom = atom(false);

/**
 *
 */
export const usePreviewMode = (): [boolean, (value: boolean) => void] => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  return [previewMode, setPreviewMode];
};
