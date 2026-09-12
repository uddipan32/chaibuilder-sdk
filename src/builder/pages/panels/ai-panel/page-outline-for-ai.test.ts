import { describe, expect, it } from "vitest";
import { ChaiBlock } from "~/types/common";
import { buildDataBindingPayload, buildPageOutlineForAi } from "./page-outline-for-ai";

const blocks: ChaiBlock[] = [
  { _id: "box-1", _type: "Box", _name: "Hero Section" },
  { _id: "h-1", _type: "Heading", _parent: "box-1", content: "Welcome to <b>Chai</b>" },
  { _id: "p-1", _type: "Paragraph", _parent: "box-1", content: "A long paragraph ".repeat(20) },
  { _id: "partial-ref", _type: "PartialBlock", partialBlockId: "header-main" },
];

describe("buildPageOutlineForAi", () => {
  it("returns empty string for no blocks", () => {
    expect(buildPageOutlineForAi([])).toBe("");
  });

  it("renders one indented line per block with bid, type, name and text", () => {
    const outline = buildPageOutlineForAi(blocks);
    const lines = outline.split("\n");
    expect(lines[0]).toBe("box-1 | Box | Hero Section");
    expect(lines[1].startsWith("  h-1 | Heading")).toBe(true);
    // Markup is stripped from text
    expect(lines[1]).toContain('"Welcome to Chai"');
    expect(lines[1]).not.toContain("<b>");
  });

  it("truncates long text", () => {
    const outline = buildPageOutlineForAi(blocks);
    const paragraphLine = outline.split("\n").find((line) => line.includes("p-1"));
    expect(paragraphLine).toContain("…");
    expect(paragraphLine!.length).toBeLessThan(120);
  });

  it("marks partial blocks as not editable on this page", () => {
    const outline = buildPageOutlineForAi(blocks);
    const partialLine = outline.split("\n").find((line) => line.includes("partial-ref"));
    expect(partialLine).toContain("partial-id=header-main");
    expect(partialLine).toContain("edit on its own page");
  });
});

describe("buildDataBindingPayload", () => {
  it("splits global and page paths and treats arrays as leaves", () => {
    const payload = buildDataBindingPayload({
      global: { user: { name: "x" }, products: [1, 2] },
      posts: [{ title: "a" }],
      settings: { layout: "grid" },
    });
    expect(payload.global).toContain("global.user.name");
    expect(payload.global).toContain("global.products");
    expect(payload.page).toContain("posts");
    expect(payload.page).toContain("settings.layout");
    expect(payload.pathTypes).toMatchObject({
      "global.user.name": "string",
      "global.products": "array",
      posts: "array",
      "settings.layout": "string",
    });
  });

  it("handles empty data", () => {
    expect(buildDataBindingPayload({})).toEqual({ global: [], page: [], arrays: [], pathTypes: {} });
  });

  it("describes array item fields so the AI can build a Repeater", () => {
    const { arrays } = buildDataBindingPayload({
      global: { banners: [{ image: "a.png" }] },
      posts: [{ title: "a", author: { name: "b" }, tags: ["x"], views: 3 }],
      tags: ["x", "y"],
      empty: [],
    });

    expect(arrays).toContainEqual({
      path: "global.banners",
      scope: "global",
      itemType: "object",
      itemFields: [{ name: "image", type: "string" }],
    });

    const posts = arrays.find((a) => a.path === "posts")!;
    expect(posts.scope).toBe("page");
    expect(posts.itemFields).toEqual([
      { name: "title", type: "string" },
      { name: "author.name", type: "string" },
      { name: "tags", type: "array" },
      { name: "views", type: "number" },
    ]);

    expect(arrays.find((a) => a.path === "tags")).toEqual({
      path: "tags",
      scope: "page",
      itemType: "string",
      itemFields: [],
    });
    expect(arrays.find((a) => a.path === "empty")).toEqual({
      path: "empty",
      scope: "page",
      itemType: "unknown",
      itemFields: [],
    });
  });
});
