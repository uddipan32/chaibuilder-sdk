import { moveBlocksWithChildren } from "~/builder/hooks/history/move-blocks-with-children";

test("Move to top level", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Block" },
    { _id: "2", _parent: "1", _type: "Block" },
    { _id: "3", _parent: "1", _type: "Block" },
    { _id: "4", _parent: "2", _type: "Block" },
    { _id: "5", _parent: "2", _type: "Block" },
    { _id: "6", _parent: "3", _type: "Block" },
  ];

  const idsToMove = ["2"];
  const newParent = undefined;
  const position = 1;

  const updatedBlocks = moveBlocksWithChildren(blocks, idsToMove[0], newParent, position);
  expect(updatedBlocks).toHaveLength(6);
});

test("Move to another parent", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Block" },
    { _id: "2", _parent: "1", _type: "Block" },
    { _id: "3", _parent: "1", _type: "Block" },
    { _id: "4", _parent: "2", _type: "Block" },
    { _id: "5", _parent: "2", _type: "Block" },
    { _id: "6", _parent: "3", _type: "Block" },
  ];

  const idsToMove = ["2"];
  const newParent = "3";
  const position = 0;

  const updatedBlocks = moveBlocksWithChildren(blocks, idsToMove[0], newParent, position);
  expect(updatedBlocks).toHaveLength(6);
});

test("Move block with children", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Text" },
    { _id: "2", _parent: "1", _type: "Text" },
    { _id: "4", _parent: "2", _type: "Text" },
    { _id: "5", _parent: "2", _type: "Text" },
    { _id: "3", _parent: "1", _type: "Text" },
    { _id: "6", _parent: "3", _type: "Text" },
  ];

  const idsToMove = ["2"];
  const newParent = undefined;
  const position = 0;

  const updatedBlocks = moveBlocksWithChildren(blocks, idsToMove[0], newParent, position);
  expect(updatedBlocks).toHaveLength(6);
  expect(updatedBlocks[0]._id).toBe("2");
  expect(updatedBlocks[0]._parent).toBe(null);
});

test("Move multiple blocks", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Text" },
    { _id: "2", _parent: "1", _type: "Text" },
    { _id: "3", _parent: "1", _type: "Text" },
    { _id: "4", _parent: "2", _type: "Text" },
    { _id: "5", _parent: "2", _type: "Text" },
    { _id: "6", _parent: "3", _type: "Text" },
    { _id: "7", _parent: "6", _type: "Text" },
  ];

  const idsToMove = ["2", "6"];
  const newParent = undefined;
  const position = 0;

  let updatedBlocks = moveBlocksWithChildren(blocks, idsToMove[0], newParent, position);
  updatedBlocks = moveBlocksWithChildren(updatedBlocks, idsToMove[1], newParent, position);
  expect(updatedBlocks).toHaveLength(7);
});

test("Move to another parent updates parent and pre-order position", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Block" },
    { _id: "2", _parent: "1", _type: "Block" },
    { _id: "3", _parent: "1", _type: "Block" },
    { _id: "4", _parent: "2", _type: "Block" },
    { _id: "5", _parent: "2", _type: "Block" },
    { _id: "6", _parent: "3", _type: "Block" },
  ];

  const updatedBlocks = moveBlocksWithChildren(blocks, "2", "3", 0);

  expect(updatedBlocks.map((b) => b._id)).toEqual(["1", "3", "2", "4", "5", "6"]);
  expect(updatedBlocks.find((b) => b._id === "2")?._parent).toBe("3");
  // descendants of the moved block keep their own parent links
  expect(updatedBlocks.find((b) => b._id === "4")?._parent).toBe("2");
  expect(updatedBlocks.find((b) => b._id === "5")?._parent).toBe("2");
});

test("Collapses a lone leftover Text sibling into the old parent", () => {
  const blocks = [
    { _id: "wrapper", _parent: undefined, _type: "Block", content: "" },
    { _id: "text", _parent: "wrapper", _type: "Text", content: "hello" },
    { _id: "img", _parent: "wrapper", _type: "Image" },
    { _id: "target", _parent: undefined, _type: "Block" },
  ];

  const updatedBlocks = moveBlocksWithChildren(blocks, "img", "target", 0);

  // the Text block is merged into the wrapper and removed
  expect(updatedBlocks.find((b) => b._id === "text")).toBeUndefined();
  expect(updatedBlocks.find((b) => b._id === "wrapper")?.content).toBe("hello");
  expect(updatedBlocks.find((b) => b._id === "img")?._parent).toBe("target");
});

test("No blocks to move", () => {
  const blocks = [
    { _id: "1", _parent: undefined, _type: "Text" },
    { _id: "2", _parent: "1", _type: "Text" },
    { _id: "3", _parent: "1", _type: "Text" },
    { _id: "4", _parent: "2", _type: "Text" },
    { _id: "5", _parent: "2", _type: "Text" },
    { _id: "6", _parent: "3", _type: "Text" },
  ];

  const newParent = undefined;
  const position = 0;

  const updatedBlocks = moveBlocksWithChildren(blocks, "", newParent, position);

  expect(updatedBlocks).toEqual([
    { _id: "1", _parent: undefined, _type: "Text" },
    { _id: "2", _parent: "1", _type: "Text" },
    { _id: "3", _parent: "1", _type: "Text" },
    { _id: "4", _parent: "2", _type: "Text" },
    { _id: "5", _parent: "2", _type: "Text" },
    { _id: "6", _parent: "3", _type: "Text" },
  ]);
});
