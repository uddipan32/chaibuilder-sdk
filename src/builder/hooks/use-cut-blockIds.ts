import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import { copiedBlockIdsAtom } from "~/builder/hooks/use-copy-blockIds";

export const cutBlockIdsAtom = atom<Array<string>>([]);

export const useCutBlockIds = () => {
  const [ids, setIds] = useAtom(cutBlockIdsAtom);
  const resetCopyIds = useSetAtom(copiedBlockIdsAtom);

  const setCutBlockIds = useCallback(
    (blockIds: Array<string>) => {
      setIds(blockIds);
      resetCopyIds([]);
    },
    [setIds, resetCopyIds],
  );

  return [ids as string[], setCutBlockIds] as const;
};
