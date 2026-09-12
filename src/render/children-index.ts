import { isEmpty } from "lodash-es";
import { ChaiBlock } from "~/types/common";

/**
 * One-pass indexes over a flat block array, replacing the renderer's previous
 * per-node `filter(blocks, ...)` child lookups. Those made tree assembly
 * O(n²) in block count: every rendered block paid a full-array `hasChildren`
 * scan, and every container another full-array children filter. A ~2,000-block
 * page (header partials included) is ~6M block comparisons per SSR render.
 *
 * Cached in a WeakMap keyed on the blocks ARRAY REFERENCE: RenderBlocks
 * recursion (and repeater row passes) spread the same array down, so the index
 * is built once per page render and garbage-collected with the array. Callers
 * that pass a new array (a new render) get a fresh index — there is no
 * cross-render or cross-request retention.
 */

// Symbol, not a string: a block's _id/_parent can be any string (the HTML
// importer preserves arbitrary DOM ids verbatim — html-to-json.ts), so a string
// root sentinel could collide with a real block id and pull its children into
// the root bucket. A Symbol key can never equal a string _parent.
const ROOT_KEY: unique symbol = Symbol("chai-root");

type BlocksIndex = {
  byParent: Map<string | symbol, ChaiBlock[]>;
  byId: Map<string, ChaiBlock>;
};

const indexCache = new WeakMap<ChaiBlock[], BlocksIndex>();

export const getBlocksIndex = (blocks: ChaiBlock[]): BlocksIndex => {
  const cached = indexCache.get(blocks);
  if (cached) return cached;
  const byParent = new Map<string | symbol, ChaiBlock[]>();
  const byId = new Map<string, ChaiBlock>();
  for (const block of blocks) {
    // Falsy _parent (undefined / null / "") = root, matching the renderer's
    // previous `!block._parent` root test. Push order preserves document order.
    const key = block?._parent ? block._parent : ROOT_KEY;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(block);
    else byParent.set(key, [block]);
    if (block?._id != null && !byId.has(block._id)) byId.set(block._id, block);
  }
  const index = { byParent, byId };
  indexCache.set(blocks, index);
  return index;
};

const EMPTY: ChaiBlock[] = [];

/** Children of `parent` in document order; empty/undefined `parent` = root blocks. */
export const getChildBlocks = (blocks: ChaiBlock[], parent?: string): ChaiBlock[] => {
  const key = isEmpty(parent) ? ROOT_KEY : (parent as string);
  return getBlocksIndex(blocks).byParent.get(key) ?? EMPTY;
};

/** Whether any block lists `blockId` as its parent — the renderer's recursion test. */
export const hasChildBlocks = (blocks: ChaiBlock[], blockId: string): boolean => {
  const bucket = getBlocksIndex(blocks).byParent.get(blockId);
  return !!bucket && bucket.length > 0;
};
