import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { useMemo } from "react";
import { PartialBlockEntry } from "~/types/partial-blocks";
import { partialBlocksAtom } from "./atoms";

/**
 * Fetch status of a single partial block. Selected per id so an outline node only
 * re-renders when the partial it points at changes state.
 */
export const usePartialBlockStatus = (partialBlockId?: string): PartialBlockEntry["status"] => {
  const statusAtom = useMemo(
    () =>
      selectAtom(partialBlocksAtom, (entries) =>
        partialBlockId ? (entries[partialBlockId]?.status ?? "idle") : "idle",
      ),
    [partialBlockId],
  );
  return useAtomValue(statusAtom);
};

/**
 * True when the referenced partial page was deleted outside the builder. The block
 * stays in the page JSON — the outline flags it so the user can remove it.
 */
export const useIsPartialBlockMissing = (partialBlockId?: string): boolean =>
  usePartialBlockStatus(partialBlockId) === "missing";
