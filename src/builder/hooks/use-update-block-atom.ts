import { Atom, atom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { isString } from "lodash-es";
import { useCallback } from "react";
import { blockAtomsMapAtom, pageBlocksAtomsAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { ChaiBlock } from "~/types/common";

type AtomGetter = <Value>(anAtom: Atom<Value>) => Value;

// Caches an id -> atom map per split-atoms array instance (e.g. partial blocks).
// splitAtom returns a new array whenever items are added/removed, so a cached
// map stays valid for the lifetime of its array.
const atomsMapCache = new WeakMap<Atom<ChaiBlock>[], Map<string, Atom<ChaiBlock>>>();

const getAtomsMap = (get: AtomGetter, splitAtoms: Atom<Atom<ChaiBlock>[]>): Map<string, Atom<ChaiBlock>> => {
  if (splitAtoms === (pageBlocksAtomsAtom as unknown as Atom<Atom<ChaiBlock>[]>)) {
    return get(blockAtomsMapAtom);
  }
  const blockAsAtoms = get(splitAtoms);
  let atomsMap = atomsMapCache.get(blockAsAtoms);
  if (!atomsMap) {
    atomsMap = new Map<string, Atom<ChaiBlock>>();
    for (const blockAtom of blockAsAtoms) {
      atomsMap.set(get(blockAtom)._id, blockAtom);
    }
    atomsMapCache.set(blockAsAtoms, atomsMap);
  }
  return atomsMap;
};

const writeAtomValue = atom(
  null, // it's a convention to pass `null` for the first argument
  (get, set, { id, props }: { id: string; props: Record<string, any> }) => {
    const blockAtom = get(blockAtomsMapAtom).get(id);
    if (!blockAtom) {
      return null;
    }
    return set(blockAtom, { ...(get(blockAtom) as any), ...props });
  },
);

export const useUpdateBlockAtom = () => {
  return useSetAtom(writeAtomValue);
};

export const useGetBlockAtomValue = (splitAtoms: Atom<Atom<ChaiBlock>[]>) => {
  return useAtomCallback(
    useCallback(
      (get, _set, idOrAtom: Atom<ChaiBlock> | string) => {
        const id = isString(idOrAtom) ? idOrAtom : get(idOrAtom as Atom<ChaiBlock>)._id;
        const blockAtom = getAtomsMap(get, splitAtoms).get(id);
        if (!blockAtom) {
          return null;
        }
        return get(blockAtom) as ChaiBlock;
      },
      [splitAtoms],
    ),
    { store: builderStore },
  );
};

export const useGetBlockAtom = (splitAtoms: Atom<Atom<ChaiBlock>[]>) => {
  return useAtomCallback(
    useCallback(
      (get, _set, idOrAtom: Atom<ChaiBlock> | string) => {
        const id = isString(idOrAtom) ? idOrAtom : get(idOrAtom as Atom<ChaiBlock>)._id;
        const blockAtom = getAtomsMap(get, splitAtoms).get(id);
        if (!blockAtom) {
          console.warn(`Block with id ${id} not found`);
          return null;
        }
        return blockAtom;
      },
      [splitAtoms],
    ),
    { store: builderStore },
  );
};
