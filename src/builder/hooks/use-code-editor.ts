import { atom, useAtom } from "jotai";

type CodeEditorProps = {
  blockId: string;
  blockProp: string;
  initialCode: string;
  placeholder?: string;
};

const codeEditorAtom = atom<CodeEditorProps | null>(null);

/**
 * Custom hook to access the current state of the code editor.
 * @category Hooks
 * @returns The current state of the code editor from the `codeEditorAtom`.
 */
export const useCodeEditor = () => {
  return useAtom(codeEditorAtom);
};
