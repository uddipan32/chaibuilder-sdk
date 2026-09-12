import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import type { ChaiBlock } from "~/types/common";
import { currentBlocksPartialIdsAtom } from "./atoms";

const b = (partial: Partial<ChaiBlock>): ChaiBlock => partial as ChaiBlock;

/**
 * The equality guard on currentBlocksPartialIdsAtom is what stops usePartialGraph
 * (mounted under every canvas block) from re-rendering on every presentBlocksAtom
 * swap. These pin that behavior: same referenced partial ids across an array swap
 * must keep the SAME value identity; a real change must produce a new value.
 */
describe("currentBlocksPartialIdsAtom", () => {
  it("extracts PartialBlock and GlobalBlock references", () => {
    const store = createStore();
    store.set(presentBlocksAtom, [
      b({ _id: "1", _type: "Box" }),
      b({ _id: "2", _type: "PartialBlock", partialBlockId: "p1" }),
      b({ _id: "3", _type: "GlobalBlock", globalBlock: "g1" }),
    ]);
    expect(store.get(currentBlocksPartialIdsAtom)).toEqual(["p1", "g1"]);
  });

  it("keeps the same value identity when a new blocks array carries the same refs (the keystroke path)", () => {
    const store = createStore();
    store.set(presentBlocksAtom, [
      b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" }),
      b({ _id: "2", _type: "Box", content: "before" }),
    ]);
    const first = store.get(currentBlocksPartialIdsAtom);
    // A prop-only edit: brand-new array, same partial refs.
    store.set(presentBlocksAtom, [
      b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" }),
      b({ _id: "2", _type: "Box", content: "after" }),
    ]);
    expect(store.get(currentBlocksPartialIdsAtom)).toBe(first);
  });

  it("produces a new value when a partial reference is added or removed", () => {
    const store = createStore();
    store.set(presentBlocksAtom, [b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" })]);
    const first = store.get(currentBlocksPartialIdsAtom);
    store.set(presentBlocksAtom, [
      b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" }),
      b({ _id: "2", _type: "PartialBlock", partialBlockId: "p2" }),
    ]);
    const second = store.get(currentBlocksPartialIdsAtom);
    expect(second).not.toBe(first);
    expect(second).toEqual(["p1", "p2"]);
  });

  it("distinguishes a reordered ref list from an unchanged one", () => {
    const store = createStore();
    store.set(presentBlocksAtom, [
      b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" }),
      b({ _id: "2", _type: "PartialBlock", partialBlockId: "p2" }),
    ]);
    const first = store.get(currentBlocksPartialIdsAtom);
    store.set(presentBlocksAtom, [
      b({ _id: "2", _type: "PartialBlock", partialBlockId: "p2" }),
      b({ _id: "1", _type: "PartialBlock", partialBlockId: "p1" }),
    ]);
    // Order-sensitive equality — a reorder is a real change, not a false-equal.
    expect(store.get(currentBlocksPartialIdsAtom)).not.toBe(first);
  });
});
