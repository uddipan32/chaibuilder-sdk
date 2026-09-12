import { describe, expect, it, vi } from "vitest";

vi.mock("~/registry", () => ({
  getAllRegisteredChaiBlocks: vi.fn(() => ({
    Gallery: {
      type: "Gallery",
      label: "Gallery",
      description: "Shows a media gallery",
      pageTypes: ["product"],
    },
    Hero: {
      type: "Hero",
      label: "Hero",
      description: "Shows a hero section",
    },
  })),
}));

vi.mock("~/server/defaults/config-registry", () => ({
  getResolvedPageType: vi.fn(() => ({ description: "A product page" })),
}));

describe("buildCustomBlockCatalog", () => {
  it("excludes blocks restricted to a different page type", async () => {
    const { buildCustomBlockCatalog } = await import("./ai-edit-page-prompt-context");
    const catalog = buildCustomBlockCatalog("page");
    expect(catalog).toContain("### Hero");
    expect(catalog).not.toContain("### Gallery");
  });

  it("includes blocks restricted to the current page type", async () => {
    const { buildCustomBlockCatalog } = await import("./ai-edit-page-prompt-context");
    const catalog = buildCustomBlockCatalog("product");
    expect(catalog).toContain("### Hero");
    expect(catalog).toContain("### Gallery");
  });

  it("treats an unset page type as the default 'page' type", async () => {
    const { buildCustomBlockCatalog } = await import("./ai-edit-page-prompt-context");
    const catalog = buildCustomBlockCatalog(undefined);
    expect(catalog).toContain("### Hero");
    expect(catalog).not.toContain("### Gallery");
  });
});

describe("buildDataBindingPipesText", () => {
  it("advertises registered pipe types and arguments", async () => {
    const { buildDataBindingPipesText } = await import("./ai-edit-page-prompt-context");
    const catalog = buildDataBindingPipesText();
    expect(catalog).toContain("Plain bindings need no formatter: {{path}}");
    expect(catalog).toContain("Never add default automatically");
    expect(catalog).toContain("accepted input type matches the binding path type");
    expect(catalog).toContain("Value formatters (regular block properties only)");
    expect(catalog).toContain("uppercase [string → string]");
    expect(catalog).toContain("currency:string (required, default 'USD')");
    expect(catalog).toContain("Example: {{path | currency 'USD'}}");
    expect(catalog).toContain("Example: {{path | date 'medium'}}");
    expect(catalog).toContain("Fallback formatter (opt-in only)");
    expect(catalog).toContain("USE ONLY when user explicitly requests a fallback value");
    expect(catalog).toContain("Boolean formatters (conditional visibility / _show only)");
    expect(catalog).toContain("gt [number|string → boolean]");
    expect(catalog).toContain("Example: {{path | gt 0}}");
  });

  it("includes application-registered formatters", async () => {
    const { registerChaiPipe } = await import("~/registry/pipes");
    const { buildDataBindingPipesText } = await import("./ai-edit-page-prompt-context");
    registerChaiPipe({
      name: "testAiSuffix",
      label: "AI test suffix",
      accepts: ["string"],
      returns: "string",
      args: [{ name: "suffix", type: "string", required: true, default: "!" }],
      transform: ({ value, args }) => `${value}${args[0]}`,
    });

    expect(buildDataBindingPipesText()).toContain("Example: {{path | testAiSuffix '!'}}");
  });
});

describe("buildDataBindingPathsText", () => {
  it("falls back when no paths are available", async () => {
    const { buildDataBindingPathsText } = await import("./ai-edit-page-prompt-context");
    expect(buildDataBindingPathsText(undefined)).toBe("No data binding paths available for this page.");
  });

  it("lists array item fields as $index paths", async () => {
    const { buildDataBindingPathsText } = await import("./ai-edit-page-prompt-context");
    const text = buildDataBindingPathsText({
      global: ["global.title"],
      page: ["posts"],
      arrays: [
        {
          path: "posts",
          scope: "page",
          itemType: "object",
          itemFields: [
            { name: "title", type: "string" },
            { name: "author.name", type: "string" },
          ],
        },
      ],
    });
    expect(text).toContain("- (page) {{posts}} — array of objects. Item fields:");
    expect(text).toContain("{{$index.title}} (string)");
    expect(text).toContain("{{$index.author.name}} (string)");
    expect(text).toContain('repeater-items="{{arrayPath}}"');
  });

  it("describes primitive and empty arrays", async () => {
    const { buildDataBindingPathsText } = await import("./ai-edit-page-prompt-context");
    const text = buildDataBindingPathsText({
      global: [],
      page: [],
      arrays: [
        { path: "tags", scope: "page", itemType: "string", itemFields: [] },
        { path: "global.banners", scope: "global", itemType: "unknown", itemFields: [] },
      ],
    });
    expect(text).toContain("- (page) {{tags}} — array of string values. Use {{$index}} for each item.");
    expect(text).toContain("- (global) {{global.banners}} — array, empty right now");
  });

  it("omits the arrays section when there are none", async () => {
    const { buildDataBindingPathsText } = await import("./ai-edit-page-prompt-context");
    const text = buildDataBindingPathsText({ global: ["global.title"], page: [], arrays: [] });
    expect(text).toBe("- (global) {{global.title}}");
  });

  it("includes path types so AI can choose compatible formatters", async () => {
    const { buildDataBindingPathsText } = await import("./ai-edit-page-prompt-context");
    const text = buildDataBindingPathsText({
      global: ["global.company.name"],
      page: ["listing.price"],
      pathTypes: { "global.company.name": "string", "listing.price": "number" },
    });
    expect(text).toContain("{{global.company.name}} (string)");
    expect(text).toContain("{{listing.price}} (number)");
  });
});
