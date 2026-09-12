import { atom, useAtom } from "jotai";

export const editorModeAtom = atom<"edit" | "view">("edit");

export const useEditorMode = () => {
  const [mode, setMode] = useAtom(editorModeAtom);
  return { mode, setMode };
};
