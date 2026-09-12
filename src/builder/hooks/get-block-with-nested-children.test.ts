import { ChaiBlock } from "~/types/common";
import { getBlockWithNestedChildren } from "./get-block-with-nested-children";

describe("getBlockWithNestedChildren", () => {
  it("should return empty array when block is not found", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2", _parent: "1" },
    ];

    const result = getBlockWithNestedChildren("non-existent", blocks);

    expect(result).toEqual([]);
  });

  it("should return only the block when it has no children", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2" },
      { _type: "Box", _id: "3" },
    ];

    const result = getBlockWithNestedChildren("2", blocks);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("2");
  });

  it("should return block with direct children", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2", _parent: "1" },
      { _type: "Box", _id: "3", _parent: "1" },
      { _type: "Box", _id: "4" },
    ];

    const result = getBlockWithNestedChildren("1", blocks);

    expect(result).toHaveLength(3);
    expect(result.map((b) => b._id)).toEqual(["1", "2", "3"]);
  });

  it("should return block with nested children (multiple levels)", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2", _parent: "1" },
      { _type: "Box", _id: "3", _parent: "2" },
      { _type: "Box", _id: "4", _parent: "3" },
      { _type: "Box", _id: "5" },
    ];

    const result = getBlockWithNestedChildren("1", blocks);

    expect(result).toHaveLength(4);
    expect(result.map((b) => b._id)).toEqual(["1", "2", "3", "4"]);
  });

  it("should return block with complex nested structure", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2", _parent: "1" },
      { _type: "Box", _id: "3", _parent: "1" },
      { _type: "Box", _id: "4", _parent: "2" },
      { _type: "Box", _id: "5", _parent: "2" },
      { _type: "Box", _id: "6", _parent: "3" },
      { _type: "Box", _id: "7", _parent: "6" },
      { _type: "Box", _id: "8" },
    ];

    const result = getBlockWithNestedChildren("1", blocks);

    expect(result).toHaveLength(7);
    expect(result.map((b) => b._id)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("should return only subtree for a child block", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1" },
      { _type: "Box", _id: "2", _parent: "1" },
      { _type: "Box", _id: "3", _parent: "2" },
      { _type: "Box", _id: "4", _parent: "3" },
      { _type: "Box", _id: "5", _parent: "1" },
    ];

    const result = getBlockWithNestedChildren("2", blocks);

    expect(result).toHaveLength(3);
    expect(result.map((b) => b._id)).toEqual(["2", "3", "4"]);
  });

  it("should handle blocks with multiple children at same level", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "parent" },
      { _type: "Box", _id: "child1", _parent: "parent" },
      { _type: "Box", _id: "child2", _parent: "parent" },
      { _type: "Box", _id: "child3", _parent: "parent" },
      { _type: "Box", _id: "grandchild1", _parent: "child1" },
      { _type: "Box", _id: "grandchild2", _parent: "child2" },
    ];

    const result = getBlockWithNestedChildren("parent", blocks);

    expect(result).toHaveLength(6);
    expect(result.map((b) => b._id)).toContain("parent");
    expect(result.map((b) => b._id)).toContain("child1");
    expect(result.map((b) => b._id)).toContain("child2");
    expect(result.map((b) => b._id)).toContain("child3");
    expect(result.map((b) => b._id)).toContain("grandchild1");
    expect(result.map((b) => b._id)).toContain("grandchild2");
  });

  it("should handle empty blocks array", () => {
    const blocks: ChaiBlock[] = [];

    const result = getBlockWithNestedChildren("1", blocks);

    expect(result).toEqual([]);
  });

  it("should handle root level block with no parent", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "root" },
      { _type: "Box", _id: "child", _parent: "root" },
    ];

    const result = getBlockWithNestedChildren("root", blocks);

    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe("root");
    expect(result[0]._parent).toBeUndefined();
  });

  it("should preserve block properties", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "1", content: "Parent", styles: "bg-red" },
      {
        _type: "Paragraph",
        _id: "2",
        _parent: "1",
        content: "Child",
        styles: "text-white",
      },
    ];

    const result = getBlockWithNestedChildren("1", blocks);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      _type: "Box",
      _id: "1",
      content: "Parent",
      styles: "bg-red",
    });
    expect(result[1]).toEqual({
      _type: "Paragraph",
      _id: "2",
      _parent: "1",
      content: "Child",
      styles: "text-white",
    });
  });

  it("should handle deeply nested structure (5+ levels)", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "level1" },
      { _type: "Box", _id: "level2", _parent: "level1" },
      { _type: "Box", _id: "level3", _parent: "level2" },
      { _type: "Box", _id: "level4", _parent: "level3" },
      { _type: "Box", _id: "level5", _parent: "level4" },
      { _type: "Box", _id: "level6", _parent: "level5" },
    ];

    const result = getBlockWithNestedChildren("level1", blocks);

    expect(result).toHaveLength(6);
    expect(result.map((b) => b._id)).toEqual(["level1", "level2", "level3", "level4", "level5", "level6"]);
  });

  it("should not include siblings of the target block", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Box", _id: "parent" },
      { _type: "Box", _id: "target", _parent: "parent" },
      { _type: "Box", _id: "sibling", _parent: "parent" },
      { _type: "Box", _id: "targetChild", _parent: "target" },
      { _type: "Box", _id: "siblingChild", _parent: "sibling" },
    ];

    const result = getBlockWithNestedChildren("target", blocks);

    expect(result).toHaveLength(2);
    expect(result.map((b) => b._id)).toEqual(["target", "targetChild"]);
    expect(result.map((b) => b._id)).not.toContain("sibling");
    expect(result.map((b) => b._id)).not.toContain("siblingChild");
    expect(result.map((b) => b._id)).not.toContain("parent");
  });
});
