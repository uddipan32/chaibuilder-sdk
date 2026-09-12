import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChaiBlock } from "~/types";
import { runInContext } from "../state";

const { mockWhere } = vi.hoisted(() => ({
  mockWhere: vi.fn(),
}));

vi.mock("~/server/chai-actions/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockWhere }) }),
  },
  safeQuery: async (fn: () => Promise<unknown>) => {
    try {
      return { data: await fn(), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  schema: {
    appPages: {
      id: "id",
      name: "name",
      slug: "slug",
      lang: "lang",
      primaryPage: "primaryPage",
      seo: "seo",
      currentEditor: "currentEditor",
      pageType: "pageType",
      lastSaved: "lastSaved",
      dynamic: "dynamic",
      parent: "parent",
      partialBlocks: "partialBlocks",
      blocks: "blocks",
      app: "app",
      deletedAt: "deletedAt",
    },
    appPagesOnline: {
      id: "id",
      blocks: "blocks",
      app: "app",
      deletedAt: "deletedAt",
    },
  },
}));

import { getFullPage } from "./get-full-page";

const block = (props: Partial<ChaiBlock> & { _id: string }): ChaiBlock => ({ _type: "Box", ...props }) as ChaiBlock;
const partialRef = (id: string, target: string): ChaiBlock =>
  ({ _id: id, _type: "PartialBlock", partialBlockId: target }) as ChaiBlock;

const pageRow = (partialBlocks: string | null) => ({
  id: "page-1",
  name: "Page",
  slug: "/page",
  lang: "en",
  primaryPage: null,
  seo: {},
  currentEditor: null,
  pageType: "page",
  lastSaved: "now",
  dynamic: false,
  parent: null,
  partialBlocks,
});

const inDraftContext = <T>(fn: () => Promise<T>): Promise<T> => runInContext({ appId: "app-1", draft: true }, fn);

describe("getFullPage partialIds", () => {
  beforeEach(() => {
    mockWhere.mockReset();
  });

  it("returns the sorted partial ids from a complete partialBlocks column", async () => {
    mockWhere.mockReturnValueOnce({ limit: async () => [pageRow("B|A")] });
    mockWhere.mockResolvedValueOnce([
      { id: "page-1", blocks: [partialRef("p1", "A"), partialRef("p2", "B")], deletedAt: null },
      { id: "A", blocks: [block({ _id: "a1" })], deletedAt: null },
      { id: "B", blocks: [block({ _id: "b1" })], deletedAt: null },
    ]);

    const result = await inDraftContext(() => getFullPage("page-1"));
    expect(result.partialIds).toEqual(["A", "B"]);
    expect(mockWhere).toHaveBeenCalledTimes(2);
  });

  it("includes partials the stale column missed but the block scan found", async () => {
    // Column only knows A; the page blocks also reference B
    mockWhere.mockReturnValueOnce({ limit: async () => [pageRow("A")] });
    mockWhere.mockResolvedValueOnce([
      { id: "page-1", blocks: [partialRef("p1", "A"), partialRef("p2", "B")], deletedAt: null },
      { id: "A", blocks: [block({ _id: "a1" })], deletedAt: null },
    ]);
    // collectPartialBlocksMap top-up fetch for B
    mockWhere.mockResolvedValueOnce([{ id: "B", blocks: [block({ _id: "b1" })] }]);

    const result = await inDraftContext(() => getFullPage("page-1"));
    expect(result.partialIds).toEqual(["A", "B"]);
    expect(mockWhere).toHaveBeenCalledTimes(3);
  });

  it("returns empty partialIds when partial merging is disabled", async () => {
    mockWhere.mockReturnValueOnce({ limit: async () => [pageRow("A")] });
    mockWhere.mockResolvedValueOnce([
      { id: "page-1", blocks: [partialRef("p1", "A")], deletedAt: null },
      { id: "A", blocks: [block({ _id: "a1" })], deletedAt: null },
    ]);

    const result = await inDraftContext(() => getFullPage("page-1", { mergePartials: false }));
    expect(result.partialIds).toEqual([]);
    expect(result.blocks.some((b: ChaiBlock) => b._type === "PartialBlock")).toBe(true);
  });
});
