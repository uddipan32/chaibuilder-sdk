import { afterEach, describe, expect, it, vi } from "vitest";

const { mockWarn } = vi.hoisted(() => ({
  mockWarn: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: vi.fn(),
      success: vi.fn(),
      warn: mockWarn,
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("./get-blocks-styles", () => ({
  getBlocksStyles: vi.fn(async () => " .bg-red-500{} "),
}));

vi.mock("./styles-helper", () => ({
  filterDuplicateStyles: vi.fn(async (styles: string) => styles.trim()),
  preloadBaseStyleSelectors: vi.fn(),
  getGlobalStylesFingerprint: vi.fn(async () => "abc123def456"),
}));

describe("get-page-styles", () => {
  afterEach(() => {
    mockWarn.mockClear();
    vi.clearAllMocks();
  });

  it("warns when uncached compile exceeds 30ms", async () => {
    const { getBlocksStyles } = await import("./get-blocks-styles");
    vi.mocked(getBlocksStyles).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
      return " .bg-red-500{} ";
    });

    const { fetchPageStylesUncached } = await import("./get-page-styles");

    await fetchPageStylesUncached([{ _id: "1", _type: "Box", _parent: null } as never]);

    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][0]).toContain("Slow page styles compile");
    expect(mockWarn.mock.calls[0][0]).toContain("blocks: 1");
  });

  it("does not warn when uncached compile is under 30ms", async () => {
    const { getBlocksStyles } = await import("./get-blocks-styles");
    vi.mocked(getBlocksStyles).mockResolvedValue(" .bg-red-500{} ");

    const { fetchPageStylesUncached } = await import("./get-page-styles");

    await fetchPageStylesUncached([{ _id: "1", _type: "Box", _parent: null } as never]);

    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("minifies whitespace before filtering duplicates", async () => {
    const { getBlocksStyles } = await import("./get-blocks-styles");
    vi.mocked(getBlocksStyles).mockResolvedValue("  .bg-red-500 {\n  background: red;\n}\n\n.p-4 { padding: 1rem; }  ");

    const { filterDuplicateStyles } = await import("./styles-helper");
    const { fetchPageStylesUncached } = await import("./get-page-styles");

    const result = await fetchPageStylesUncached([{ _id: "1", _type: "Box", _parent: null } as never]);

    expect(vi.mocked(filterDuplicateStyles)).toHaveBeenCalledWith(
      ".bg-red-500 { background: red; } .p-4 { padding: 1rem; }",
    );
    expect(result).toBe(".bg-red-500 { background: red; } .p-4 { padding: 1rem; }");
  });

  it("warms the duplicate-filter selector cache while styles compile", async () => {
    const { getBlocksStyles } = await import("./get-blocks-styles");
    const { preloadBaseStyleSelectors } = await import("./styles-helper");

    let preloadedBeforeCompile = false;
    vi.mocked(getBlocksStyles).mockImplementation(async () => {
      preloadedBeforeCompile = vi.mocked(preloadBaseStyleSelectors).mock.calls.length > 0;
      return " .bg-red-500{} ";
    });

    const { fetchPageStylesUncached } = await import("./get-page-styles");
    await fetchPageStylesUncached([{ _id: "1", _type: "Box", _parent: null } as never]);

    expect(preloadedBeforeCompile).toBe(true);
  });

  it("keys the persisted cache by the merge version and global stylesheet fingerprint", async () => {
    vi.resetModules();
    vi.doMock("../state", () => ({
      getInitializedState: () => ({ appId: "app-1" }),
    }));
    const withChaiCache = vi.fn((fn: (...args: unknown[]) => unknown) => fn);
    vi.doMock("./cache-utils", () => ({ withChaiCache }));

    const { getPageStyles } = await import("./get-page-styles");
    await getPageStyles("page-1", []);

    expect(withChaiCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["page-styles-app-1-page-1-c2-m3-g-abc123def456"],
      ["page-styles", "page-page-1"],
      false,
      "fetchPageStyles",
    );

    vi.doUnmock("../state");
    vi.doUnmock("./cache-utils");
    vi.resetModules();
  });
});
