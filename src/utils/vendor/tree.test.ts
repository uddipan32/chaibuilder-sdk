import { describe, expect, it } from "vitest";
import { parseTree, TreeNode } from "./tree";

type Model = { _id: string; children?: Model[] };

const buildTree = () =>
  parseTree<Model>({
    _id: "root",
    children: [
      { _id: "a", children: [{ _id: "b", children: [{ _id: "b1" }] }] },
      { _id: "c", children: [] },
    ],
  });

const walkIds = (node: TreeNode<Model>) => {
  const ids: string[] = [];
  node.walk((n) => {
    ids.push(n.model._id);
    return true;
  });
  return ids;
};

describe("parseTree", () => {
  it("builds nodes mirroring the nested model, with parent links", () => {
    const root = buildTree();
    expect(root.model._id).toBe("root");
    expect(root.children.map((n) => n.model._id)).toEqual(["a", "c"]);
    const b = root.children[0].children[0];
    expect(b.model._id).toBe("b");
    expect(b.parent?.model._id).toBe("a");
    expect(b.children[0].parent).toBe(b);
  });
});

describe("walk", () => {
  it("visits nodes in pre-order (parent before children, siblings in order)", () => {
    expect(walkIds(buildTree())).toEqual(["root", "a", "b", "b1", "c"]);
  });

  it("stops early when the visitor returns false", () => {
    const visited: string[] = [];
    buildTree().walk((n) => {
      visited.push(n.model._id);
      return n.model._id !== "b";
    });
    expect(visited).toEqual(["root", "a", "b"]);
  });
});

describe("first", () => {
  it("returns the first matching node in pre-order", () => {
    const root = buildTree();
    expect(root.first((n) => n.model._id === "b1")?.model._id).toBe("b1");
  });

  it("returns undefined when nothing matches", () => {
    expect(buildTree().first((n) => n.model._id === "nope")).toBeUndefined();
  });
});

describe("drop", () => {
  it("detaches the subtree from both the node tree and the model tree", () => {
    const root = buildTree();
    const b = root.first((n) => n.model._id === "b")!;
    b.drop();
    expect(walkIds(root)).toEqual(["root", "a", "c"]);
    expect(root.model.children![0].children).toEqual([]);
    expect(b.parent).toBeNull();
    // the dropped subtree stays intact
    expect(walkIds(b)).toEqual(["b", "b1"]);
  });

  it("is a no-op on the root node", () => {
    const root = buildTree();
    expect(root.drop()).toBe(root);
    expect(walkIds(root)).toEqual(["root", "a", "b", "b1", "c"]);
  });
});

describe("addChildAtIndex", () => {
  it("inserts into both the node tree and the model tree at the given index", () => {
    const root = buildTree();
    const b = root.first((n) => n.model._id === "b")!;
    const c = root.first((n) => n.model._id === "c")!;
    b.drop();
    c.addChildAtIndex(b, 0);
    expect(walkIds(root)).toEqual(["root", "a", "c", "b", "b1"]);
    expect(c.model.children!.map((m) => m._id)).toEqual(["b"]);
    expect(b.parent).toBe(c);
  });

  it("creates the model children array when missing", () => {
    const root = parseTree<Model>({ _id: "root", children: [{ _id: "leaf" }] });
    const leaf = root.first((n) => n.model._id === "leaf")!;
    leaf.addChildAtIndex(new TreeNode<Model>({ _id: "new" }), 0);
    expect(leaf.model.children!.map((m) => m._id)).toEqual(["new"]);
  });

  it("supports insertion between existing siblings", () => {
    const root = parseTree<Model>({ _id: "root", children: [{ _id: "x" }, { _id: "y" }] });
    root.addChildAtIndex(new TreeNode<Model>({ _id: "mid" }), 1);
    expect(root.children.map((n) => n.model._id)).toEqual(["x", "mid", "y"]);
    expect(root.model.children!.map((m) => m._id)).toEqual(["x", "mid", "y"]);
  });

  it("throws on an out-of-range index", () => {
    const root = buildTree();
    expect(() => root.addChildAtIndex(new TreeNode<Model>({ _id: "z" }), 5)).toThrow();
    expect(() => root.addChildAtIndex(new TreeNode<Model>({ _id: "z" }), -1)).toThrow();
  });
});
