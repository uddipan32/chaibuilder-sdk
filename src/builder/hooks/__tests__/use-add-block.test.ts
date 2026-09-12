import { getParentAndPosition } from "~/builder/hooks/use-add-block";
import { ChaiBlock } from "~/types/common";

vi.mock("~/builder/core/functions/block-helpers", () => ({
  canAcceptChildBlock: vi.fn(),
  canBeNestedInside: vi.fn(),
}));

import { canAcceptChildBlock, canBeNestedInside } from "~/builder/core/functions/block-helpers";

const mockCanAcceptChildBlock = canAcceptChildBlock as ReturnType<typeof vi.fn>;
const mockCanBeNestedInside = canBeNestedInside as ReturnType<typeof vi.fn>;

describe("getParentAndPosition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all blocks can accept children and be nested inside
    mockCanAcceptChildBlock.mockReturnValue(true);
    mockCanBeNestedInside.mockReturnValue(true);
  });

  describe("when no parent and no selection", () => {
    it("returns undefined parentBlockId and undefined insertPosition", () => {
      const allBlocks: ChaiBlock[] = [{ _id: "block-1", _type: "Box" }];
      const result = getParentAndPosition("Text", allBlocks, []);

      expect(result.parentBlockId).toBeUndefined();
      expect(result.insertPosition).toBeUndefined();
    });
  });

  describe("when providedParentId is given", () => {
    it("uses providedParentId as the starting candidate", () => {
      const allBlocks: ChaiBlock[] = [{ _id: "container", _type: "Box" }];
      const result = getParentAndPosition("Text", allBlocks, [], "container");

      expect(result.parentBlockId).toBe("container");
      expect(result.insertPosition).toBeUndefined();
    });

    it("uses providedParentId over selectedBlockIds when both are present", () => {
      const allBlocks: ChaiBlock[] = [
        { _id: "selected-block", _type: "Box" },
        { _id: "provided-parent", _type: "Box" },
      ];
      const result = getParentAndPosition("Text", allBlocks, ["selected-block"], "provided-parent");

      expect(result.parentBlockId).toBe("provided-parent");
    });

    it("respects provided position when given", () => {
      const allBlocks: ChaiBlock[] = [{ _id: "container", _type: "Box" }];
      const result = getParentAndPosition("Text", allBlocks, [], "container", 3);

      expect(result.parentBlockId).toBe("container");
      expect(result.insertPosition).toBe(3);
    });
  });

  describe("when selectedBlockIds is used as starting point", () => {
    it("uses the first selected block as the candidate parent", () => {
      const allBlocks: ChaiBlock[] = [
        { _id: "sel-1", _type: "Box" },
        { _id: "sel-2", _type: "Box" },
      ];
      const result = getParentAndPosition("Text", allBlocks, ["sel-1", "sel-2"]);

      expect(result.parentBlockId).toBe("sel-1");
    });
  });

  describe("when candidate cannot accept child (walks up the tree)", () => {
    it("walks up to the parent when the selected block cannot accept the child", () => {
      mockCanAcceptChildBlock.mockImplementation((parentType: string) => parentType === "Box");
      mockCanBeNestedInside.mockReturnValue(true);

      const allBlocks: ChaiBlock[] = [
        { _id: "box", _type: "Box" },
        { _id: "text", _type: "Text", _parent: "box" },
      ];
      // "text" cannot accept "Text" (canAcceptChildBlock returns false for "Text" parent)
      // "box" can accept it
      const result = getParentAndPosition("Text", allBlocks, ["text"]);

      expect(result.parentBlockId).toBe("box");
    });

    it("inserts after the previously-traversed sibling when walking up", () => {
      mockCanAcceptChildBlock.mockImplementation((parentType: string) => parentType === "Box");
      mockCanBeNestedInside.mockReturnValue(true);

      const allBlocks: ChaiBlock[] = [
        { _id: "box", _type: "Box" },
        { _id: "sibling-1", _type: "Text", _parent: "box" },
        { _id: "sibling-2", _type: "Text", _parent: "box" },
        { _id: "sibling-3", _type: "Text", _parent: "box" },
      ];
      // Start from sibling-2 (index 1 in siblings). After walking up, the new block
      // should be inserted after sibling-2, i.e. at index 2.
      const result = getParentAndPosition("Text", allBlocks, ["sibling-2"]);

      expect(result.parentBlockId).toBe("box");
      expect(result.insertPosition).toBe(2);
    });

    it("walks all the way to root when no ancestor can accept the child", () => {
      mockCanAcceptChildBlock.mockReturnValue(false);
      mockCanBeNestedInside.mockReturnValue(true);

      const allBlocks: ChaiBlock[] = [
        { _id: "section", _type: "Section" },
        { _id: "box", _type: "Box", _parent: "section" },
        { _id: "text", _type: "Text", _parent: "box" },
      ];
      const result = getParentAndPosition("Text", allBlocks, ["text"]);

      expect(result.parentBlockId).toBeUndefined();
    });

    it("computes root-level insertPosition after walking to root", () => {
      mockCanAcceptChildBlock.mockReturnValue(false);
      mockCanBeNestedInside.mockReturnValue(true);

      // Three root-level blocks; user selects section-2
      const allBlocks: ChaiBlock[] = [
        { _id: "section-1", _type: "Section" },
        { _id: "section-2", _type: "Section" },
        { _id: "section-3", _type: "Section" },
      ];
      const result = getParentAndPosition("Text", allBlocks, ["section-2"]);

      expect(result.parentBlockId).toBeUndefined();
      // section-2 is at root index 1, so new block should be inserted at index 2
      expect(result.insertPosition).toBe(2);
    });
  });

  describe("canBeNestedInside constraint", () => {
    it("skips a parent when canBeNestedInside returns false even if canAcceptChildBlock is true", () => {
      mockCanAcceptChildBlock.mockReturnValue(true);
      // Only allow nesting when parent is "Box"
      mockCanBeNestedInside.mockImplementation((parentType: string) => parentType === "Box");

      const allBlocks: ChaiBlock[] = [
        { _id: "box", _type: "Box" },
        { _id: "section", _type: "Section", _parent: "box" },
        { _id: "text", _type: "Text", _parent: "section" },
      ];
      // "section" accepts children but canBeNestedInside returns false for Section,
      // so it should walk up to "box"
      const result = getParentAndPosition("Text", allBlocks, ["text"]);

      expect(result.parentBlockId).toBe("box");
    });
  });

  describe("providedPosition overrides auto-computed position", () => {
    it("does not overwrite insertPosition when providedPosition is given", () => {
      mockCanAcceptChildBlock.mockImplementation((parentType: string) => parentType === "Box");
      mockCanBeNestedInside.mockReturnValue(true);

      const allBlocks: ChaiBlock[] = [
        { _id: "box", _type: "Box" },
        { _id: "sibling-1", _type: "Text", _parent: "box" },
        { _id: "sibling-2", _type: "Text", _parent: "box" },
      ];
      // Even though sibling-2 is at index 1, providedPosition=0 should be respected
      const result = getParentAndPosition("Text", allBlocks, ["sibling-2"], undefined, 0);

      expect(result.parentBlockId).toBe("box");
      expect(result.insertPosition).toBe(0);
    });
  });

  describe("when candidateParent block is not found in allBlocks", () => {
    it("stops walking and returns undefined parent when block id is not in allBlocks", () => {
      const allBlocks: ChaiBlock[] = [];
      const result = getParentAndPosition("Text", allBlocks, ["non-existent-id"]);

      expect(result.parentBlockId).toBeUndefined();
      expect(result.insertPosition).toBeUndefined();
    });
  });

  describe("deep tree traversal", () => {
    it("traverses multiple levels to find a valid ancestor", () => {
      // Box -> Section -> Div -> Text (selected)
      // Only Box can accept Text
      mockCanAcceptChildBlock.mockImplementation((parentType: string) => parentType === "Box");
      mockCanBeNestedInside.mockReturnValue(true);

      const allBlocks: ChaiBlock[] = [
        { _id: "box", _type: "Box" },
        { _id: "section", _type: "Section", _parent: "box" },
        { _id: "div", _type: "Div", _parent: "section" },
        { _id: "text", _type: "Text", _parent: "div" },
      ];
      const result = getParentAndPosition("NewText", allBlocks, ["text"]);

      expect(result.parentBlockId).toBe("box");
      // "section" is the direct child of "box" that was last traversed, and it is at index 0
      expect(result.insertPosition).toBe(1);
    });
  });
});
