import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChaiBlock } from "~/types/common";
import {
  applyAddBlocks,
  applyAddCustomBlock,
  applyBindProp,
  applyEditBlock,
  applyRemoveBlocks,
  normalizeAiParentId,
  normalizeAiPosition,
} from "./ai-edit-executors";

const registryState = vi.hoisted(() => ({ definitions: {} as Record<string, any> }));

vi.mock("~/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/registry")>();
  return {
    ...actual,
    getRegisteredChaiBlock: (type: string) => registryState.definitions[type],
    getAllRegisteredChaiBlocks: () => registryState.definitions,
  };
});

const baseBlocks = (): ChaiBlock[] => [
  { _id: "box", _type: "Box", styles: "#styles:,grid" },
  {
    _id: "target",
    _type: "Heading",
    _parent: "box",
    tag: "h2",
    content: "Old",
    styles: "#styles:,text-lg",
    retainedProp: "keep",
  },
  { _id: "outside", _type: "Paragraph", content: "Outside" },
];

describe("AI edit executors", () => {
  beforeEach(() => {
    registryState.definitions = {
      Box: { type: "Box", canAcceptBlock: () => true },
      Heading: { type: "Heading" },
      Paragraph: { type: "Paragraph" },
      PartialBlock: { type: "PartialBlock" },
      ProductCard: { type: "ProductCard" },
    };
  });

  test("edit_block preserves bids and existing props through merge", async () => {
    const result = await applyEditBlock(
      baseBlocks(),
      "target",
      '<h2 bid="target" class="text-3xl">New title</h2>',
    );

    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    const edited = result.blocks.find((block) => block._id === "target");
    expect(edited).toMatchObject({ content: "New title", retainedProp: "keep", _parent: "box" });
    expect(edited?.styles).toContain("text-3xl");
  });

  test("edit_block rejects external bids and full documents", async () => {
    const external = await applyEditBlock(baseBlocks(), "target", '<h2 bid="outside">Wrong</h2>');
    expect(external).toEqual(
      expect.objectContaining({ error: expect.stringContaining('outside "target"') }),
    );

    const document = await applyEditBlock(baseBlocks(), "target", "<!DOCTYPE html><html><body>x</body></html>");
    expect(document).toEqual({
      error: "Full-document HTML is not allowed. Send only the complete target element or new block markup.",
    });
  });

  test("edit_block validates partial references", async () => {
    const result = await applyEditBlock(
      baseBlocks(),
      "target",
      '<chai-partial-block partial-id="forbidden"></chai-partial-block>',
      { validatePartialReference: (id) => (id === "forbidden" ? "cycle detected" : null) },
    );
    expect(result).toEqual({ error: "cycle detected" });
  });

  test("add_blocks enforces parent existence and nesting rules", async () => {
    const missing = await applyAddBlocks(baseBlocks(), "<p>New</p>", "missing");
    expect(missing).toEqual(
      expect.objectContaining({ error: expect.stringContaining('No block with bid "missing"') }),
    );

    const blocks = [
      { _id: "box", _type: "Box" },
      { _id: "partial", _type: "PartialBlock", _parent: "box" },
    ] as ChaiBlock[];
    const result = await applyAddBlocks(blocks, "<h2>New</h2>", "partial");
    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    expect(result.parentId).toBe("box");
    expect(result.position).toBe(1);
    expect(result.insertedBlocks?.[0]._parent).toBe("box");
  });

  test("add_blocks strips stray bids and rejects explicit id collisions", async () => {
    const added = await applyAddBlocks(baseBlocks(), '<h2 bid="target">Copied</h2>');
    expect(added).not.toHaveProperty("error");
    if ("error" in added) return;
    expect(added.insertedBlocks?.[0]).not.toHaveProperty("_bid");
    expect(added.insertedBlocks?.[0]._id).not.toBe("target");

    const collision = await applyAddBlocks(
      baseBlocks(),
      '<chai-product-card chai-type="ProductCard" id="outside"></chai-product-card>',
    );
    expect(collision).toEqual(
      expect.objectContaining({ error: expect.stringContaining('reuses id "outside"') }),
    );
  });

  test("add_custom_block sanitizes props and protects structural fields", () => {
    const result = applyAddCustomBlock(baseBlocks(), "ProductCard", undefined, undefined, {
      _id: "attacker-id",
      _type: "Paragraph",
      title: "Card",
      htmlCode: '<script>alert(1)</script><img src="javascript:alert(2)" onerror="alert(3)">',
      nested: { constructor: "drop", text: "safe" },
    });

    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    const block = result.insertedBlocks?.[0];
    expect(block?._id).not.toBe("attacker-id");
    expect(block?._type).toBe("ProductCard");
    expect(block?.htmlCode).not.toMatch(/script|onerror/i);
    expect(block?.nested).toEqual({ text: "safe" });
  });

  test("add_custom_block lists valid types for unknown type", () => {
    const result = applyAddCustomBlock(baseBlocks(), "MissingBlock");
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/Unknown block type "MissingBlock".*ProductCard/),
      }),
    );
  });

  test("bind_prop validates existence, reserved props, and advertised paths", () => {
    const paths = { global: ["site.name"], page: ["product.title"] };
    const bound = applyBindProp(baseBlocks(), "target", "content", "{{product.title}}", {
      dataBindingPaths: paths,
    });
    expect(bound).not.toHaveProperty("error");
    if (!("error" in bound)) {
      expect(bound.blocks.find((block) => block._id === "target")?.content).toBe("{{product.title}}");
    }

    expect(applyBindProp(baseBlocks(), "missing", "content", "{{product.title}}", { dataBindingPaths: paths })).toEqual(
      expect.objectContaining({ error: expect.stringContaining('No block with bid "missing"') }),
    );
    expect(applyBindProp(baseBlocks(), "target", "_id", "{{product.title}}", { dataBindingPaths: paths })).toEqual(
      expect.objectContaining({ error: expect.stringContaining('reserved property "_id"') }),
    );
    expect(applyBindProp(baseBlocks(), "target", "content", "{{invented.path}}", { dataBindingPaths: paths })).toEqual(
      expect.objectContaining({ error: expect.stringContaining("not a valid binding") }),
    );
  });

  test("remove_blocks rejects all-unknown ids and reports partially skipped ids", () => {
    expect(applyRemoveBlocks(baseBlocks(), ["missing"])).toEqual(
      expect.objectContaining({ error: expect.stringContaining("No blocks found") }),
    );

    const result = applyRemoveBlocks(baseBlocks(), ["target", "missing"]);
    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    expect(result.blocks.some((block) => block._id === "target")).toBe(false);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(result.removableIds).toEqual(["target"]);
  });

  test("normalizes optional targeting fields consistently", () => {
    expect(normalizeAiParentId("  null ")).toBeUndefined();
    expect(normalizeAiParentId(" parent ")).toBe("parent");
    expect(normalizeAiPosition("0")).toBe(0);
    expect(normalizeAiPosition(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
