import { atom, type Atom } from "jotai";
import { isEmpty, get as lodashGet } from "lodash-es";
import { blockAtomsMapAtom } from "~/builder/atoms/blocks";
import { ChaiBlock } from "~/types/common";

const EMPTY_RUNTIME_PROPS_ATOM = atom({});
const MAX_RUNTIME_PROPS_ATOM_CACHE = 5000;

type RuntimePropsAtomCacheEntry = {
  runtimeProps: Record<string, any>;
  atom: Atom<Record<string, any>>;
};

const runtimePropsAtomCache = new Map<string, RuntimePropsAtomCacheEntry>();

const enforceRuntimePropsAtomCacheLimit = () => {
  while (runtimePropsAtomCache.size > MAX_RUNTIME_PROPS_ATOM_CACHE) {
    const oldestKey = runtimePropsAtomCache.keys().next().value;
    if (!oldestKey) return;
    runtimePropsAtomCache.delete(oldestKey);
  }
};

const shallowEqual = (a: Record<string, any>, b: Record<string, any>) => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
};

const createRuntimePropsAtom = (blockId: string, runtimeProps: Record<string, any>) => {
  // Keep the previous resolved value and return it while nothing changed —
  // otherwise every store update produces a fresh object and re-renders every
  // block with runtime props on every keystroke.
  let lastValue: Record<string, any> | null = null;
  return atom((get) => {
    const atomsById = get(blockAtomsMapAtom);

    const hierarchy: ChaiBlock[] = [];
    let blockAtom = atomsById.get(blockId);
    while (blockAtom) {
      const block = get(blockAtom) as ChaiBlock;
      hierarchy.push(block);
      blockAtom = block._parent ? atomsById.get(block._parent) : undefined;
    }

    const next = Object.entries(runtimeProps).reduce(
      (acc: Record<string, any>, [key, schema]) => {
        const matchingBlock = hierarchy.find((block) => block._type === lodashGet(schema, "block"));
        if (matchingBlock) {
          acc[key] = lodashGet(matchingBlock, lodashGet(schema, "prop"), null);
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    if (lastValue && shallowEqual(lastValue, next)) {
      return lastValue;
    }
    lastValue = next;
    return next;
  });
};

/**
 * Atom that resolves runtime props for a specific block.
 * Only subscribes to the blocks store when runtimeProps is non-empty.
 *
 * Usage: const runtimePropsAtom = getRuntimePropsAtom(blockId, runtimePropsSchema);
 */
export const getRuntimePropsAtom = (blockId: string, runtimeProps: Record<string, any>) => {
  // If no runtime props, return one static empty object atom (no subscription)
  if (isEmpty(runtimeProps)) {
    return EMPTY_RUNTIME_PROPS_ATOM;
  }

  const cached = runtimePropsAtomCache.get(blockId);
  if (cached && cached.runtimeProps === runtimeProps) {
    return cached.atom;
  }

  const runtimeAtom = createRuntimePropsAtom(blockId, runtimeProps);
  runtimePropsAtomCache.set(blockId, { runtimeProps, atom: runtimeAtom });
  enforceRuntimePropsAtomCacheLimit();
  return runtimeAtom;
};
