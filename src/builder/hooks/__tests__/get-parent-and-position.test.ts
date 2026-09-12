/**
 * @vitest-environment happy-dom
 */
import { getParentAndPosition } from "~/builder/hooks/use-add-block";
import { getRegisteredChaiBlock } from "~/registry";
import { ChaiBlock } from "~/types/common";

vi.mock("~/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/registry")>();
  return {
    ...actual,
    getRegisteredChaiBlock: vi.fn(),
  };
});

const mockRegistry = (definitions: Record<string, any>) => {
  (getRegisteredChaiBlock as any).mockImplementation((type: string) => definitions[type]);
};

describe("getParentAndPosition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a provided parent that accepts the child", () => {
    mockRegistry({ Box: { canAcceptBlock: () => true }, Heading: {} });
    const blocks = [{ _id: "box-1", _type: "Box" }] as ChaiBlock[];

    const result = getParentAndPosition("Heading", blocks, [], "box-1", 2);

    expect(result).toEqual({ parentBlockId: "box-1", insertPosition: 2 });
  });

  it("never nests inside a PartialBlock — walks up to its parent", () => {
    // PartialBlock registers no canAcceptBlock, so it can never take children
    mockRegistry({ Box: { canAcceptBlock: () => true }, PartialBlock: {}, Heading: {} });
    const blocks = [
      { _id: "box-1", _type: "Box" },
      { _id: "sibling", _type: "Heading", _parent: "box-1" },
      { _id: "partial-1", _type: "PartialBlock", _parent: "box-1" },
    ] as ChaiBlock[];

    const result = getParentAndPosition("Heading", blocks, [], "partial-1");

    // lands next to the partial (right after it), never inside it
    expect(result).toEqual({ parentBlockId: "box-1", insertPosition: 2 });
  });

  it("falls back to page root when a root-level PartialBlock is targeted", () => {
    mockRegistry({ PartialBlock: {}, Section: {} });
    const blocks = [
      { _id: "section-1", _type: "Section" },
      { _id: "partial-1", _type: "PartialBlock" },
    ] as ChaiBlock[];

    const result = getParentAndPosition("Section", blocks, [], "partial-1");

    expect(result).toEqual({ parentBlockId: undefined, insertPosition: 2 });
  });

  it("adds at page root when no parent and no selection are provided", () => {
    mockRegistry({});
    const result = getParentAndPosition("Section", [], [], undefined, undefined);

    expect(result).toEqual({ parentBlockId: undefined, insertPosition: undefined });
  });
});
