import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { PartialBlockEntry, PartialBlockList } from "~/types/partial-blocks";
import { extractPartialIds } from "./utils";

/**
 * Consolidated atom storing all partial block data
 */
export const partialBlocksAtom = atom<Record<string, PartialBlockEntry>>({});

const stringArraysEqual = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((id, i) => id === b[i]));

/**
 * Partial/Global page ids referenced by the CURRENT page's (possibly unsaved)
 * blocks. Equality-guarded so subscribers only re-render when the referenced
 * id list actually changes — NOT on every `presentBlocksAtom` array swap,
 * i.e. not on every keystroke. This matters because `usePartialGraph` sits
 * under the per-block canvas dnd hooks (every block on the canvas mounts it);
 * subscribing there to the raw blocks array re-rendered every block on every
 * edit — measured at canvas-render-bench.test.tsx.
 */
export const currentBlocksPartialIdsAtom = selectAtom(presentBlocksAtom, extractPartialIds, stringArraysEqual);

/**
 * Atom for storing the list of available partial blocks
 */
export const partialBlocksListAtom = atom<PartialBlockList>({});
