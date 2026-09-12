import { ChaiBlock } from "~/types/common";
import { filterOutlineBlocks, FilterOutlineBlocksOptions } from "./filter-outline-blocks";

const treeData = [
  {
    _id: "box-1",
    _type: "Box",
    _name: "Hero Section",
    children: [
      { _id: "text-1", _type: "Text", _name: "Heading", children: [] },
      { _id: "text-2", _type: "Text", _name: "Subheading", children: [] },
      {
        _id: "box-2",
        _type: "Box",
        _name: "Inner Box",
        children: [{ _id: "image-1", _type: "Image", _name: "Hero Image", children: [] }],
      },
    ],
  },
  { _id: "text-3", _type: "Text", _name: "Footer Text", children: [] },
  { _id: "button-1", _type: "Button", _name: "CTA Button", children: [] },
];

const baseOptions = (
  overrides: Partial<FilterOutlineBlocksOptions> = {},
): FilterOutlineBlocksOptions => ({
  term: "",
  types: [],
  conditionalOnly: false,
  bindingsOnly: false,
  animationsOnly: false,
  ...overrides,
});

const contentTree = [
  { _id: "c-en", _type: "Text", _name: "EN", children: [] },
  { _id: "c-fr", _type: "Text", _name: "FR", children: [] },
  { _id: "c-align", _type: "Text", _name: "Align", children: [] },
  { _id: "c-html", _type: "Text", _name: "HTML", children: [] },
  { _id: "show-false", _type: "Box", _name: "Hidden", children: [] },
  { _id: "show-expr", _type: "Box", _name: "Cond", children: [] },
  { _id: "show-true", _type: "Box", _name: "Visible", children: [] },
  { _id: "show-missing", _type: "Box", _name: "Plain", children: [] },
  { _id: "bind-str", _type: "Text", _name: "Bound", children: [] },
  { _id: "bind-rep", _type: "Repeater", _name: "List", children: [] },
  { _id: "bind-nested", _type: "Box", _name: "Nested", children: [] },
  { _id: "bind-show-only", _type: "Box", _name: "ShowBind", children: [] },
  { _id: "anim-yes", _type: "Box", _name: "Fade", children: [] },
  { _id: "anim-no", _type: "Box", _name: "NoAnim", children: [] },
];

const fullBlocks = new Map<string, ChaiBlock>([
  ["c-en", { _id: "c-en", _type: "Text", _name: "EN", content: "Hello world" } as ChaiBlock],
  ["c-fr", { _id: "c-fr", _type: "Text", _name: "FR", "content-fr": "Bonjour" } as ChaiBlock],
  ["c-align", { _id: "c-align", _type: "Text", _name: "Align", contentAlign: "center hello" } as ChaiBlock],
  ["c-html", { _id: "c-html", _type: "Text", _name: "HTML", content: "<div>hi</div>" } as ChaiBlock],
  ["show-false", { _id: "show-false", _type: "Box", _name: "Hidden", _show: false } as ChaiBlock],
  ["show-expr", { _id: "show-expr", _type: "Box", _name: "Cond", _show: "{{data.visible}}" } as ChaiBlock],
  ["show-true", { _id: "show-true", _type: "Box", _name: "Visible", _show: true } as ChaiBlock],
  ["show-missing", { _id: "show-missing", _type: "Box", _name: "Plain" } as ChaiBlock],
  ["bind-str", { _id: "bind-str", _type: "Text", _name: "Bound", content: "{{data.title}}" } as ChaiBlock],
  ["bind-rep", { _id: "bind-rep", _type: "Repeater", _name: "List", repeaterItems: "{{data.items}}" } as ChaiBlock],
  [
    "bind-nested",
    { _id: "bind-nested", _type: "Box", _name: "Nested", link: { href: "{{data.url}}", target: "_self" } } as ChaiBlock,
  ],
  ["bind-show-only", { _id: "bind-show-only", _type: "Box", _name: "ShowBind", _show: "{{data.visible}}" } as ChaiBlock],
  [
    "anim-yes",
    {
      _id: "anim-yes",
      _type: "Box",
      _name: "Fade",
      styles_attrs: { "data-animation": "fade-in|ease|500|0|once" },
    } as ChaiBlock,
  ],
  ["anim-no", { _id: "anim-no", _type: "Box", _name: "NoAnim", styles_attrs: { "data-foo": "bar" } } as ChaiBlock],
]);

const getContentProps = (type: string) => (type === "Text" ? ["content"] : []);

describe("filterOutlineBlocks", () => {
  describe("no active filters", () => {
    it("returns null when term and types are all empty/false", () => {
      expect(filterOutlineBlocks(treeData, baseOptions())).toBeNull();
    });

    it("returns null when term is only whitespace and no other filters", () => {
      expect(filterOutlineBlocks(treeData, baseOptions({ term: "   " }))).toBeNull();
    });

    it("returns null when new flags are all false", () => {
      expect(
        filterOutlineBlocks(
          contentTree,
          baseOptions({ conditionalOnly: false, bindingsOnly: false, animationsOnly: false }),
        ),
      ).toBeNull();
    });
  });

  describe("term-only filter", () => {
    it("matches blocks by _name (case-insensitive)", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "heading" }));
      expect(result).not.toBeNull();
      expect(result!.map((b) => b._id)).toEqual(expect.arrayContaining(["text-1", "text-2"]));
    });

    it("matches blocks by _type (case-insensitive)", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "image" }));
      expect(result).not.toBeNull();
      expect(result!.map((b) => b._id)).toEqual(["image-1"]);
    });

    it("returns empty array when no blocks match the term", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "nonexistent" }));
      expect(result).toEqual([]);
    });

    it("matches across all nesting levels", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "box" }));
      expect(result).not.toBeNull();
      expect(result!.map((b) => b._id)).toEqual(expect.arrayContaining(["box-1", "box-2"]));
    });
  });

  describe("content search", () => {
    it("matches content prop", () => {
      const result = filterOutlineBlocks(
        contentTree,
        baseOptions({ term: "hello", fullBlocks, getContentProps }),
      );
      expect(result!.map((b) => b._id)).toContain("c-en");
    });

    it("matches localized content-fr prop", () => {
      const result = filterOutlineBlocks(
        contentTree,
        baseOptions({ term: "bonjour", fullBlocks, getContentProps }),
      );
      expect(result!.map((b) => b._id)).toEqual(["c-fr"]);
    });

    it("does not match without fullBlocks/getContentProps", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ term: "hello" }));
      expect(result).toEqual([]);
    });

    it("does not match contentAlign as content key", () => {
      const result = filterOutlineBlocks(
        contentTree,
        baseOptions({ term: "hello", fullBlocks, getContentProps }),
      );
      expect(result!.map((b) => b._id)).not.toContain("c-align");
    });

    it("does not match HTML tag names", () => {
      const result = filterOutlineBlocks(
        contentTree,
        baseOptions({ term: "div", fullBlocks, getContentProps }),
      );
      expect(result!.map((b) => b._id)).not.toContain("c-html");
    });
  });

  describe("type-only filter", () => {
    it("returns only blocks of the specified type", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ types: ["Text"] }));
      expect(result).not.toBeNull();
      expect(result!.every((b) => b._type === "Text")).toBe(true);
      expect(result!.map((b) => b._id)).toEqual(expect.arrayContaining(["text-1", "text-2", "text-3"]));
    });

    it("supports multiple selected types", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ types: ["Button", "Image"] }));
      expect(result).not.toBeNull();
      expect(result!.map((b) => b._id)).toEqual(expect.arrayContaining(["button-1", "image-1"]));
      expect(result!.every((b) => ["Button", "Image"].includes(b._type as string))).toBe(true);
    });

    it("returns empty array when no blocks match the type filter", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ types: ["Video"] }));
      expect(result).toEqual([]);
    });
  });

  describe("conditionalOnly filter", () => {
    it("matches _show false and binding expression", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ conditionalOnly: true, fullBlocks }));
      expect(result!.map((b) => b._id)).toEqual(expect.arrayContaining(["show-false", "show-expr", "bind-show-only"]));
    });

    it("excludes _show true and missing _show", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ conditionalOnly: true, fullBlocks }));
      const ids = result!.map((b) => b._id);
      expect(ids).not.toContain("show-true");
      expect(ids).not.toContain("show-missing");
    });
  });

  describe("bindingsOnly filter", () => {
    it("matches string, repeaterItems, and nested object bindings", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ bindingsOnly: true, fullBlocks }));
      expect(result!.map((b) => b._id)).toEqual(
        expect.arrayContaining(["bind-str", "bind-rep", "bind-nested"]),
      );
    });

    it("excludes _-prefixed keys (only _show binding does not count)", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ bindingsOnly: true, fullBlocks }));
      expect(result!.map((b) => b._id)).not.toContain("bind-show-only");
    });
  });

  describe("animationsOnly filter", () => {
    it("matches styles_attrs with data-animation", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ animationsOnly: true, fullBlocks }));
      expect(result!.map((b) => b._id)).toEqual(["anim-yes"]);
    });

    it("excludes _attrs without data-animation", () => {
      const result = filterOutlineBlocks(contentTree, baseOptions({ animationsOnly: true, fullBlocks }));
      expect(result!.map((b) => b._id)).not.toContain("anim-no");
    });
  });

  describe("combined filters", () => {
    it("applies term and type filter together (AND logic)", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "sub", types: ["Text"] }));
      expect(result).not.toBeNull();
      expect(result!.map((b) => b._id)).toEqual(["text-2"]);
    });

    it("returns empty array when combined filters match nothing", () => {
      const result = filterOutlineBlocks(treeData, baseOptions({ term: "hero", types: ["Text"] }));
      expect(result).toEqual([]);
    });

    it("AND bindingsOnly with type filter", () => {
      const result = filterOutlineBlocks(
        contentTree,
        baseOptions({ bindingsOnly: true, types: ["Text"], fullBlocks }),
      );
      expect(result!.map((b) => b._id)).toEqual(["bind-str"]);
    });
  });
});
