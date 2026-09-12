import { describe, expect, it } from "vitest";
import { ChaiBlock } from "~/types/common";
import { getBlocksIndex, getChildBlocks, hasChildBlocks } from "./children-index";

const b = (partial: Partial<ChaiBlock>): ChaiBlock => partial as ChaiBlock;

describe("children-index", () => {
  it("preserves document order within a parent, exactly like the old full-array filter", () => {
    const blocks = [
      b({ _id: "r1", _type: "Box" }),
      b({ _id: "c2", _type: "Span", _parent: "r1" }),
      b({ _id: "r2", _type: "Box" }),
      b({ _id: "c1", _type: "Span", _parent: "r1" }),
      b({ _id: "c3", _type: "Span", _parent: "r2" }),
    ];
    expect(getChildBlocks(blocks, "r1").map((x) => x._id)).toEqual(["c2", "c1"]);
    expect(getChildBlocks(blocks, "r2").map((x) => x._id)).toEqual(["c3"]);
    // Old behavior reference: filter(blocks, (x) => x._parent === parent)
    expect(getChildBlocks(blocks, "r1")).toEqual(blocks.filter((x) => x._parent === "r1"));
  });

  it("treats every falsy _parent (undefined, null, empty string) as root", () => {
    const blocks = [
      b({ _id: "a", _type: "Box" }),
      b({ _id: "b", _type: "Box", _parent: null as any }),
      b({ _id: "c", _type: "Box", _parent: "" }),
      b({ _id: "d", _type: "Box", _parent: "a" }),
    ];
    // Old root test: `!block._parent`; old root selection used isEmpty(parent).
    expect(getChildBlocks(blocks).map((x) => x._id)).toEqual(["a", "b", "c"]);
    expect(getChildBlocks(blocks, undefined).map((x) => x._id)).toEqual(["a", "b", "c"]);
    expect(getChildBlocks(blocks, "").map((x) => x._id)).toEqual(["a", "b", "c"]);
  });

  it("hasChildBlocks counts children without an _id, like the old hasChildren scan", () => {
    // Old: filter(blocks, (x) => x._parent === id).length > 0 — no _id requirement.
    const blocks = [b({ _id: "a", _type: "Box" }), b({ _type: "Span", _parent: "a" } as any)];
    expect(hasChildBlocks(blocks, "a")).toBe(true);
    expect(hasChildBlocks(blocks, "missing")).toBe(false);
  });

  it("byId keeps the first block for a duplicated id, like lodash find", () => {
    const first = b({ _id: "dup", _type: "Box", content: "first" });
    const second = b({ _id: "dup", _type: "Box", content: "second" });
    expect(getBlocksIndex([first, second]).byId.get("dup")).toBe(first);
  });

  it("does not treat a block whose _id equals the root sentinel as a root", () => {
    // The HTML importer preserves arbitrary DOM ids as block _id, so a block can
    // legitimately be _id "__chai_root__". It must not collide with the internal
    // root bucket: it stays a normal child, and its own children resolve to it.
    const blocks = [
      b({ _id: "page", _type: "Box" }),
      b({ _id: "__chai_root__", _type: "Box", _parent: "page" }),
      b({ _id: "leaf", _type: "Span", _parent: "__chai_root__" }),
    ];
    // Roots are only the falsy-_parent blocks — the sentinel-named block is NOT a root.
    expect(getChildBlocks(blocks).map((x) => x._id)).toEqual(["page"]);
    // Its real children still resolve, and it reports as having children.
    expect(getChildBlocks(blocks, "__chai_root__").map((x) => x._id)).toEqual(["leaf"]);
    expect(hasChildBlocks(blocks, "__chai_root__")).toBe(true);
  });

  it("caches per array reference and rebuilds for a new array", () => {
    const blocks = [b({ _id: "a", _type: "Box" })];
    expect(getBlocksIndex(blocks)).toBe(getBlocksIndex(blocks));
    expect(getBlocksIndex([...blocks])).not.toBe(getBlocksIndex(blocks));
  });
});
