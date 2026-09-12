import { atom } from "jotai";
import { useAtom } from "jotai";

export const inlineEditingActiveAtom = atom("");
inlineEditingActiveAtom.debugLabel = "inlineEditingActiveAtom";

const inlineEditingItemIndexAtom = atom(0);
inlineEditingItemIndexAtom.debugLabel = "inlineEditingItemIndexAtom";

export const useInlineEditing = () => {
  const [editingBlockId, setEditingBlockId] = useAtom(inlineEditingActiveAtom);
  const [editingItemIndex, setEditingItemIndex] = useAtom(inlineEditingItemIndexAtom);

  return {
    editingBlockId,
    editingItemIndex,
    setEditingBlockId,
    setEditingItemIndex,
  };
};
