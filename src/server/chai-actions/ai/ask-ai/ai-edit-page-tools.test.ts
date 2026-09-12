import { beforeEach, describe, expect, it, vi } from "vitest";

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
      metadata: "metadata",
      pageType: "pageType",
      partialBlocks: "partialBlocks",
      app: "app",
      slug: "slug",
      lang: "lang",
      deletedAt: "deletedAt",
    },
  },
}));

vi.mock("~/server/chai-builder/state", () => ({
  getInitializedStateWithUser: () => ({ appId: "app-1" }),
}));

import { buildAiEditPageTools, extractBlockHtmlSlices, isValidAiBindingTemplate } from "./ai-edit-page-tools";

const PAGE_HTML = `
<div bid="root-1" class="page">
  <section bid="hero-1" chai-name="Hero Section" class="hero">
    <h1 bid="heading-1">Welcome</h1>
    <p bid="para-1">Sub text</p>
  </section>
  <chai-product-card chai-type="ProductCard" bid="card-1" product-id="p1"></chai-product-card>
</div>
`;

describe("extractBlockHtmlSlices", () => {
  it("returns the full outerHTML of a matched block including descendants", () => {
    const result = extractBlockHtmlSlices(PAGE_HTML, ["hero-1"]);
    // himalaya stringifies attributes with single quotes
    expect(result["hero-1"]).toMatch(/bid='hero-1'/);
    expect(result["hero-1"]).toMatch(/bid='heading-1'/);
    expect(result["hero-1"]).toContain("Welcome");
  });

  it("extracts multiple blocks in one call", () => {
    const result = extractBlockHtmlSlices(PAGE_HTML, ["heading-1", "card-1"]);
    expect(result["heading-1"]).toContain("<h1");
    expect(result["card-1"]).toContain("chai-product-card");
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("returns an error message for unknown bids", () => {
    const result = extractBlockHtmlSlices(PAGE_HTML, ["nope-1"]);
    expect(result["nope-1"]).toContain("ERROR");
    expect(result["nope-1"]).toContain("nope-1");
  });

  it("does not search inside an already matched block twice", () => {
    const result = extractBlockHtmlSlices(PAGE_HTML, ["hero-1", "heading-1"]);
    expect(result["hero-1"]).toMatch(/bid='heading-1'/);
    // heading-1 is inside hero-1; the parent slice already contains it, so it
    // is not extracted separately — the entry explains where to find it.
    expect(result["heading-1"]).toBeDefined();
  });
});

describe("isValidAiBindingTemplate", () => {
  const paths = {
    global: ["global.company.name"],
    page: ["listing.price", "tags"],
    arrays: [
      {
        path: "products",
        scope: "page" as const,
        itemType: "object",
        itemFields: [
          { name: "title", type: "string" },
          { name: "price", type: "number" },
        ],
      },
    ],
  };

  it("allows advertised paths and registered value formatters", () => {
    expect(isValidAiBindingTemplate("{{listing.price | currency 'USD'}}", "content", paths)).toBe(true);
    expect(isValidAiBindingTemplate("{{$index.title | uppercase}}", "content", paths)).toBe(true);
  });

  it("rejects unadvertised paths and context-invalid boolean formatters", () => {
    expect(isValidAiBindingTemplate("{{listing.cost | currency 'USD'}}", "content", paths)).toBe(false);
    expect(isValidAiBindingTemplate("{{listing.price | gt 0}}", "content", paths)).toBe(false);
    expect(isValidAiBindingTemplate("{{listing.price | gt 0}}", "_show", paths)).toBe(true);
  });

  // The runtime skips unregistered pipes, but the model must still stick to the advertised catalog.
  it("rejects formatters that are not registered", () => {
    expect(isValidAiBindingTemplate("{{listing.price | money '$xx'}}", "content", paths)).toBe(false);
    expect(isValidAiBindingTemplate("{{listing.price | invented}}", "content")).toBe(false);
  });
});

describe("get_partial_blocks nesting filter", () => {
  // MAX_PARTIAL_DEPTH = 3. Chain mega -> layout -> header (partialBlocks columns
  // hold the closure); footer is an unused leaf. This is the same fixture as the
  // depth3 twin (mocked); here it runs against the real constant.
  const PARTIAL_PAGES = [
    { id: "header", name: "Header", metadata: {}, pageType: "global", partialBlocks: "" },
    { id: "footer", name: "Footer", metadata: {}, pageType: "global", partialBlocks: "" },
    { id: "layout", name: "Layout", metadata: {}, pageType: "global", partialBlocks: "header" },
    { id: "mega", name: "Mega", metadata: {}, pageType: "global", partialBlocks: "layout|header" },
  ];

  const getPartialBlocks = (pageId?: string) =>
    (buildAiEditPageTools({ pageHtml: "", pageId }) as any).get_partial_blocks;

  beforeEach(() => {
    mockWhere.mockReset();
    mockWhere.mockResolvedValue(PARTIAL_PAGES);
  });

  it("lists every partial when editing a regular page", async () => {
    // Budget on a page is the full MAX_PARTIAL_DEPTH (3), so even mega (depth 3) fits.
    const result = await getPartialBlocks("page-1").execute({});
    expect(Object.keys(result.partials).sort()).toEqual(["footer", "header", "layout", "mega"]);
    expect(result.note).toBeUndefined();
  });

  it("excludes the partial being edited (self-nesting)", async () => {
    // Editing footer (fresh leaf): budget 3 - 1 = 2. header (1) and layout (2)
    // fit; mega (3) is too deep; footer is excluded as self.
    const result = await getPartialBlocks("footer").execute({});
    expect(Object.keys(result.partials).sort()).toEqual(["header", "layout"]);
    expect(result.partials.footer).toBeUndefined();
  });

  it("excludes a partial too deep to fit while allowing a nested one that does", async () => {
    // Editing footer (budget 2): a non-leaf that fits (layout, depth 2) is now
    // allowed — the depth-3 relaxation — while mega (depth 3) is still excluded.
    const result = await getPartialBlocks("footer").execute({});
    expect(result.partials.layout).toBeDefined();
    expect(result.partials.mega).toBeUndefined();
    expect(result.note).toContain("editing a partial");
  });

  it("returns no partials when the edited partial is already used inside another partial", async () => {
    // header is nested two deep (mega -> layout -> header), so its budget is 0.
    const result = await getPartialBlocks("header").execute({});
    expect(result.partials).toEqual({});
    expect(result.note).toContain("maximum nesting depth");
  });

  it("keeps the full list when no pageId is provided", async () => {
    const result = await getPartialBlocks(undefined).execute({});
    expect(Object.keys(result.partials).sort()).toEqual(["footer", "header", "layout", "mega"]);
  });
});
